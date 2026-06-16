import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import type { LearningReport, DayReport, StudyHallDay, TestCenterDay, DailyReportDay } from '@/types/srm-portal';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function toKSTDate(isoStr: string): string {
  const d = new Date(isoStr);
  d.setHours(d.getHours() + 9); // UTC → KST
  return d.toISOString().slice(0, 10);
}

async function generateStudyHallNarrative(stats: {
  durationMinutes: number;
  totalProblems: number;
  correctCount: number;
  accuracy: number;
}): Promise<string> {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `스터디홀 학습 결과를 학부모께 전달할 따뜻한 한 문장 요약을 작성해주세요.
학습 시간: ${stats.durationMinutes}분 / 문제 수: ${stats.totalProblems}개 / 정답: ${stats.correctCount}개 / 정답률: ${stats.accuracy}%
조건: 한 문장, 정중하고 따뜻한 어조, 숫자를 자연스럽게 포함, 격려 포함.`,
    }],
    max_tokens: 120,
    temperature: 0.7,
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const cookieStore = await cookies();
  const session = cookieStore.get(`portal_session_${token}`);
  if (!session || session.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('sfv2_profile_id')
    .eq('portal_token', token)
    .single();

  if (!student?.sfv2_profile_id) {
    return NextResponse.json({ error: 'no_v2_profile' }, { status: 404 });
  }

  const profileId = student.sfv2_profile_id;

  // 4가지 데이터 병렬 조회
  const [
    { data: shSessions },
    { data: shAttempts },
    { data: tcSessions },
    { data: tcAttempts },
    { data: dailyReports },
  ] = await Promise.all([
    supabaseSFv2.from('study_hall_session')
      .select('id, started_at, ended_at')
      .eq('user_id', profileId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(30),
    supabaseSFv2.from('study_hall_unit_attempts')
      .select('study_hall_session_id, is_correct, attempted_at')
      .eq('student_id', profileId)
      .order('attempted_at', { ascending: false })
      .limit(500),
    supabaseSFv2.from('test_center_session')
      .select('id, started_at')
      .eq('user_id', profileId)
      .order('started_at', { ascending: false })
      .limit(20),
    supabaseSFv2.from('test_center_lesson_attempts')
      .select('test_center_session_id, score, total, status')
      .eq('student_id', profileId)
      .not('score', 'is', null),
    supabaseSFv2.from('daily_reports')
      .select('report_date, report_md, status')
      .eq('student_id', profileId)
      .eq('status', 'sent')
      .order('report_date', { ascending: false })
      .limit(30),
  ]);

  // 날짜별 맵 구성
  const dayMap = new Map<string, DayReport>();

  function getOrCreate(date: string): DayReport {
    if (!dayMap.has(date)) dayMap.set(date, { date, items: [] });
    return dayMap.get(date)!;
  }

  // ── Study Hall ─────────────────────────────────────────────────────────
  const shSessionMap = new Map<string, { started_at: string; ended_at: string }>();
  for (const s of shSessions ?? []) {
    shSessionMap.set(s.id, { started_at: s.started_at, ended_at: s.ended_at });
  }

  // 세션별 집계 → 날짜별 집계
  const shBySession = new Map<string, { total: number; correct: number }>();
  for (const a of shAttempts ?? []) {
    const sid = a.study_hall_session_id as string;
    if (!shBySession.has(sid)) shBySession.set(sid, { total: 0, correct: 0 });
    const e = shBySession.get(sid)!;
    e.total++;
    if (a.is_correct) e.correct++;
  }

  const shByDate = new Map<string, { totalMinutes: number; totalProblems: number; correctCount: number }>();
  for (const [sid, stats] of shBySession) {
    const s = shSessionMap.get(sid);
    if (!s) continue;
    const date = toKSTDate(s.started_at);
    const minutes = Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
    if (!shByDate.has(date)) shByDate.set(date, { totalMinutes: 0, totalProblems: 0, correctCount: 0 });
    const d = shByDate.get(date)!;
    d.totalMinutes += minutes;
    d.totalProblems += stats.total;
    d.correctCount += stats.correct;
  }

  // AI 서술 생성 (병렬)
  await Promise.all(
    Array.from(shByDate.entries()).map(async ([date, stats]) => {
      const accuracy = stats.totalProblems > 0
        ? Math.round((stats.correctCount / stats.totalProblems) * 100)
        : 0;
      const narrative = stats.totalProblems > 0
        ? await generateStudyHallNarrative({ durationMinutes: stats.totalMinutes, totalProblems: stats.totalProblems, correctCount: stats.correctCount, accuracy })
        : `${stats.totalMinutes}분간 스터디홀에 접속했습니다.`;

      const item: StudyHallDay = {
        type: 'study_hall',
        durationMinutes: stats.totalMinutes,
        totalProblems: stats.totalProblems,
        correctCount: stats.correctCount,
        accuracy,
        aiNarrative: narrative,
      };
      getOrCreate(date).items.push(item);
    })
  );

  // ── Test Center ─────────────────────────────────────────────────────────
  const tcSessionDateMap = new Map<string, string>();
  for (const s of tcSessions ?? []) {
    tcSessionDateMap.set(s.id, toKSTDate(s.started_at));
  }

  const tcBySession = new Map<string, { sections: { score: number; total: number }[] }>();
  for (const a of tcAttempts ?? []) {
    const sid = a.test_center_session_id as string;
    if (!tcSessionDateMap.has(sid)) continue;
    if (!tcBySession.has(sid)) tcBySession.set(sid, { sections: [] });
    tcBySession.get(sid)!.sections.push({ score: a.score as number, total: a.total as number });
  }

  for (const [sid, data] of tcBySession) {
    const date = tcSessionDateMap.get(sid)!;
    const totalScore = data.sections.reduce((s, x) => s + x.score, 0);
    const totalProblems = data.sections.reduce((s, x) => s + x.total, 0);
    const item: TestCenterDay = {
      type: 'test_center',
      sections: data.sections,
      totalScore,
      totalProblems,
    };
    getOrCreate(date).items.push(item);
  }

  // ── Daily Reports (레슨 피드백) ─────────────────────────────────────────
  for (const dr of dailyReports ?? []) {
    const item: DailyReportDay = {
      type: 'daily_report',
      reportMd: dr.report_md as string,
    };
    getOrCreate(dr.report_date as string).items.push(item);
  }

  // 날짜 내림차순 정렬
  const days = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  const report: LearningReport = { days };
  return NextResponse.json(report);
}
