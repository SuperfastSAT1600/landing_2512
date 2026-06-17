import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import type { LearningReport, DayReport, StudyHallDay, StudyHallSkill, TestCenterDay, TestCenterLesson, DailyReportDay, VocaDay } from '@/types/srm-portal';

/** Box at which a vocab entry is considered fully mastered (Leitner top box). */
const VOCAB_MASTER_BOX = 5;
/** Max review terms surfaced per day. */
const VOCAB_MAX_MISSED = 6;

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
  skills: StudyHallSkill[];
}): Promise<string> {
  const topSkills = stats.skills
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map(s => `${s.skill} (${s.correct}/${s.total}문항)`)
    .join(', ');

  const skillLine = topSkills
    ? `오늘 학습한 주요 스킬: ${topSkills}`
    : '';

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'SAT 학원 강사. 스터디홀 학습 데이터를 받아 3문장 리포트를 작성한다.',
      },
      {
        role: 'user',
        content: '학습 시간: 45분 / 총 문제: 60개 / 정답: 48개 / 정답률: 80%\n스킬: Words in Context (48/60문항)',
      },
      {
        role: 'assistant',
        content: 'Words in Context 스킬 60문항을 45분 동안 풀어 정답률 80%(48/60)를 기록했습니다. 틀린 12문항은 문맥 속 어휘 뉘앙스를 구별하는 유형에서 집중 발생했으며, 특히 추상 명사를 대체어로 선택하는 문항의 오답률이 높아 해당 유형을 집중 보완할 필요가 있습니다. 다음 수업에서는 Words in Context 오답 문항을 5개 선별해 오류 원인을 함께 분석하고 유사 문제로 즉시 재연습할 예정입니다.',
      },
      {
        role: 'user',
        content: `학습 시간: ${stats.durationMinutes}분 / 총 문제: ${stats.totalProblems}개 / 정답: ${stats.correctCount}개 / 정답률: ${stats.accuracy}%\n${skillLine}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
}

async function generateTestCenterNarrative(stats: {
  curriculumTitle?: string;
  curriculumDomain?: string;
  totalScore: number;
  totalProblems: number;
  lessons: TestCenterLesson[];
}): Promise<string> {
  const accuracy = stats.totalProblems > 0
    ? Math.round((stats.totalScore / stats.totalProblems) * 100)
    : 0;
  const lessonLines = stats.lessons
    .map(l => `${l.title ?? '모듈'}: ${l.score}/${l.total}`)
    .join(', ');
  const currLine = stats.curriculumTitle
    ? `테스트: ${stats.curriculumTitle}${stats.curriculumDomain ? ` (${stats.curriculumDomain})` : ''}`
    : '';

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'SAT 학원 강사. 테스트 결과 데이터를 받아 3문장 리포트를 작성한다.',
      },
      {
        role: 'user',
        content: '테스트: SAT Practice Test 1 (reading_and_writing)\n총 점수: 35/44 (80%)\n모듈별 점수: Module 1: 18/22, Module 2: 17/22',
      },
      {
        role: 'assistant',
        content: 'SAT Practice Test 1 RW 영역에서 44문항 중 35문항을 맞혀 정답률 80%를 기록했으며, Module 1(18/22)과 Module 2(17/22) 모두 안정적인 성취를 보였습니다. 두 모듈에서 고르게 발생한 오답은 Standard English Conventions의 접속사·문장 부호 선택 유형으로, 규칙을 암기하는 단계에서 실제 문맥에 적용하는 과정의 연습이 더 필요해 보입니다. 다음 수업에서는 해당 유형 오답 5문항을 선별해 오류 원인을 분석하고 유사 문제로 즉시 재연습하겠습니다.',
      },
      {
        role: 'user',
        content: `${currLine}\n총 점수: ${stats.totalScore}/${stats.totalProblems} (${accuracy}%)\n모듈별 점수: ${lessonLines}`,
      },
    ],
    max_tokens: 350,
    temperature: 0.7,
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
}

async function generateVocaNarrative(stats: {
  wordCount: number;
  gradedCount: number;
  correctCount: number;
  accuracy: number;
  masteredCount: number;
  missedTerms: string[];
}): Promise<string> {
  const missedLine = stats.missedTerms.length
    ? `복습 필요 단어: ${stats.missedTerms.join(', ')}`
    : '복습 필요 단어 없음';

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'SAT 학원 강사. 학생의 하루 어휘(단어) 학습 데이터를 받아 학부모용 3문장 리포트를 작성한다.',
      },
      {
        role: 'user',
        content: '학습 단어 수: 24개 / 채점 문항: 30개 / 정답: 25개 / 정답률: 83% / 마스터: 4개\n복습 필요 단어: capricious, ephemeral',
      },
      {
        role: 'assistant',
        content: '오늘 24개 단어를 30문항으로 학습해 정답률 83%(25/30)를 기록했고, 4개 단어가 완전 암기 단계(마스터)에 도달했습니다. capricious·ephemeral처럼 추상적 의미의 단어에서 오답이 집중되어, 의미가 비슷한 단어를 혼동하는 패턴이 보입니다. 내일은 복습 단어를 예문과 함께 다시 노출해 장기 기억으로 굳히겠습니다.',
      },
      {
        role: 'user',
        content: `학습 단어 수: ${stats.wordCount}개 / 채점 문항: ${stats.gradedCount}개 / 정답: ${stats.correctCount}개 / 정답률: ${stats.accuracy}% / 마스터: ${stats.masteredCount}개\n${missedLine}`,
      },
    ],
    max_tokens: 300,
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
    { data: tcAttempts },
    { data: dailyReports },
    { data: vocabEvents },
  ] = await Promise.all([
    supabaseSFv2.from('study_hall_session')
      .select('id, started_at, ended_at')
      .eq('user_id', profileId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(60),
    supabaseSFv2.from('study_hall_unit_attempts')
      .select('study_hall_session_id, is_correct, attempted_at, unit_id')
      .eq('student_id', profileId)
      .order('attempted_at', { ascending: false })
      .limit(500),
    supabaseSFv2.from('test_center_lesson_attempts')
      .select('test_center_session_id, score, total, status, lesson_id, curriculum_id')
      .eq('student_id', profileId)
      .not('score', 'is', null),
    supabaseSFv2.from('daily_reports')
      .select('report_date, report_md, status')
      .eq('student_id', profileId)
      .eq('status', 'sent')
      .order('report_date', { ascending: false })
      .limit(30),
    // vocab graded events (vocab schema). subject_id === sfv2_profile_id (auth user id).
    supabaseSFv2.schema('vocab').from('events')
      .select('entry_id, is_correct, prev_box, new_box, occurred_at')
      .eq('subject_id', profileId)
      .eq('kind', 'graded')
      .order('occurred_at', { ascending: false })
      .limit(1000),
  ]);

  // units 메타데이터 조회 (skill, domain 집계용)
  const unitIds = [...new Set((shAttempts ?? []).map(a => a.unit_id as string).filter(Boolean))];
  const { data: unitsMeta } = unitIds.length
    ? await supabaseSFv2.from('units').select('id, skill, domain').in('id', unitIds)
    : { data: [] };
  const unitsMap = new Map<string, { skill: string; domain: string }>();
  for (const u of unitsMeta ?? []) {
    if (u.id && u.skill) unitsMap.set(u.id, { skill: u.skill as string, domain: u.domain as string });
  }

  // test_center 룩업: session 날짜 + lesson 제목 + curriculum 제목 (병렬)
  const tcSessionIds = [...new Set((tcAttempts ?? []).map(a => a.test_center_session_id as string).filter(Boolean))];
  const tcLessonIds  = [...new Set((tcAttempts ?? []).map(a => a.lesson_id as string).filter(Boolean))];
  const tcCurriculumIds = [...new Set((tcAttempts ?? []).map(a => a.curriculum_id as string).filter(Boolean))];

  const [
    { data: tcSessions },
    { data: tcLessons },
    { data: tcCurricula },
  ] = await Promise.all([
    tcSessionIds.length
      ? supabaseSFv2.from('test_center_session').select('id, started_at').in('id', tcSessionIds)
      : { data: [] },
    tcLessonIds.length
      ? supabaseSFv2.from('lessons').select('id, title').in('id', tcLessonIds)
      : { data: [] },
    tcCurriculumIds.length
      ? supabaseSFv2.from('curricula').select('id, title, domain').in('id', tcCurriculumIds)
      : { data: [] },
  ]);

  // 룩업 맵
  const lessonTitleMap = new Map<string, string>();
  for (const l of tcLessons ?? []) {
    if (l.id && l.title) lessonTitleMap.set(l.id as string, l.title as string);
  }
  const curriculumMap = new Map<string, { title: string; domain: string }>();
  for (const c of tcCurricula ?? []) {
    if (c.id && c.title) curriculumMap.set(c.id, { title: c.title as string, domain: (c.domain as string) ?? '' });
  }

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

  // 세션별 스킬 집계
  const shSkillsBySession = new Map<string, Map<string, { skill: string; domain: string; correct: number; total: number }>>();
  for (const a of shAttempts ?? []) {
    const sid = a.study_hall_session_id as string;
    const uid = a.unit_id as string;
    if (!uid) continue;
    const meta = unitsMap.get(uid);
    if (!meta?.skill) continue;
    if (!shSkillsBySession.has(sid)) shSkillsBySession.set(sid, new Map());
    const skillMap = shSkillsBySession.get(sid)!;
    if (!skillMap.has(meta.skill)) skillMap.set(meta.skill, { skill: meta.skill, domain: meta.domain, correct: 0, total: 0 });
    const sk = skillMap.get(meta.skill)!;
    sk.total++;
    if (a.is_correct) sk.correct++;
  }

  const shByDate = new Map<string, { totalMinutes: number; totalProblems: number; correctCount: number; skillMap: Map<string, { skill: string; domain: string; correct: number; total: number }> }>();
  for (const [sid, stats] of shBySession) {
    const s = shSessionMap.get(sid);
    if (!s) continue;
    const date = toKSTDate(s.started_at);
    const minutes = Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
    if (!shByDate.has(date)) shByDate.set(date, { totalMinutes: 0, totalProblems: 0, correctCount: 0, skillMap: new Map() });
    const d = shByDate.get(date)!;
    d.totalMinutes += minutes;
    d.totalProblems += stats.total;
    d.correctCount += stats.correct;
    // 스킬 병합
    const sessionSkills = shSkillsBySession.get(sid);
    if (sessionSkills) {
      for (const [skillKey, sk] of sessionSkills) {
        if (!d.skillMap.has(skillKey)) d.skillMap.set(skillKey, { skill: sk.skill, domain: sk.domain, correct: 0, total: 0 });
        const ds = d.skillMap.get(skillKey)!;
        ds.correct += sk.correct;
        ds.total += sk.total;
      }
    }
  }

  // AI 서술 생성 (병렬)
  await Promise.all(
    Array.from(shByDate.entries()).map(async ([date, stats]) => {
      const accuracy = stats.totalProblems > 0
        ? Math.round((stats.correctCount / stats.totalProblems) * 100)
        : 0;
      const skills = Array.from(stats.skillMap.values());
      const narrative = stats.totalProblems > 0
        ? await generateStudyHallNarrative({ durationMinutes: stats.totalMinutes, totalProblems: stats.totalProblems, correctCount: stats.correctCount, accuracy, skills })
        : `${stats.totalMinutes}분간 스터디홀에 접속했습니다.`;

      const item: StudyHallDay = {
        type: 'study_hall',
        durationMinutes: stats.totalMinutes,
        totalProblems: stats.totalProblems,
        correctCount: stats.correctCount,
        accuracy,
        aiNarrative: narrative,
        skills: skills.length > 0 ? skills : undefined,
      };
      getOrCreate(date).items.push(item);
    })
  );

  // ── Test Center ─────────────────────────────────────────────────────────
  const tcSessionDateMap = new Map<string, string>();
  for (const s of tcSessions ?? []) {
    tcSessionDateMap.set(s.id, toKSTDate(s.started_at));
  }

  const tcBySession = new Map<string, {
    lessons: TestCenterLesson[];
    curriculumTitle?: string;
    curriculumDomain?: string;
  }>();

  for (const a of tcAttempts ?? []) {
    const sid = a.test_center_session_id as string;
    if (!tcSessionDateMap.has(sid)) continue;
    if (!tcBySession.has(sid)) {
      const currId = a.curriculum_id as string | undefined;
      const curriculum = currId ? curriculumMap.get(currId) : undefined;
      tcBySession.set(sid, {
        lessons: [],
        curriculumTitle: curriculum?.title,
        curriculumDomain: curriculum?.domain,
      });
    }
    const lessonId = a.lesson_id as string | undefined;
    tcBySession.get(sid)!.lessons.push({
      title: lessonId ? lessonTitleMap.get(lessonId) : undefined,
      score: a.score as number,
      total: a.total as number,
    });
  }

  // AI 서술 생성 (병렬)
  await Promise.all(
    Array.from(tcBySession.entries()).map(async ([sid, data]) => {
      const date = tcSessionDateMap.get(sid)!;
      const totalScore = data.lessons.reduce((s, x) => s + x.score, 0);
      const totalProblems = data.lessons.reduce((s, x) => s + x.total, 0);
      const narrative = totalProblems > 0
        ? await generateTestCenterNarrative({
            curriculumTitle: data.curriculumTitle,
            curriculumDomain: data.curriculumDomain,
            totalScore,
            totalProblems,
            lessons: data.lessons,
          })
        : undefined;

      const item: TestCenterDay = {
        type: 'test_center',
        curriculumTitle: data.curriculumTitle,
        curriculumDomain: data.curriculumDomain,
        lessons: data.lessons,
        totalScore,
        totalProblems,
        aiNarrative: narrative,
      };
      getOrCreate(date).items.push(item);
    })
  );

  // ── Daily Reports (레슨 피드백) ─────────────────────────────────────────
  for (const dr of dailyReports ?? []) {
    const item: DailyReportDay = {
      type: 'daily_report',
      reportMd: dr.report_md as string,
    };
    getOrCreate(dr.report_date as string).items.push(item);
  }

  // ── Vocab (단어) ──────────────────────────────────────────────────────────
  type VocaAgg = {
    entryIds: Set<string>;
    gradedCount: number;
    correctCount: number;
    masteredIds: Set<string>;
    missedIds: string[];
  };
  const vocaByDate = new Map<string, VocaAgg>();
  for (const e of vocabEvents ?? []) {
    const entryId = e.entry_id as string | null;
    if (!entryId) continue;
    const date = toKSTDate(e.occurred_at as string);
    if (!vocaByDate.has(date)) {
      vocaByDate.set(date, { entryIds: new Set(), gradedCount: 0, correctCount: 0, masteredIds: new Set(), missedIds: [] });
    }
    const agg = vocaByDate.get(date)!;
    agg.entryIds.add(entryId);
    agg.gradedCount++;
    if (e.is_correct === true) agg.correctCount++;
    if (e.is_correct === false) agg.missedIds.push(entryId);
    const prevBox = (e.prev_box as number | null) ?? 0;
    const newBox = (e.new_box as number | null) ?? 0;
    if (newBox >= VOCAB_MASTER_BOX && prevBox < VOCAB_MASTER_BOX) agg.masteredIds.add(entryId);
  }

  // Resolve missed entry ids → terms (single lookup across all days).
  const missedEntryIds = [...new Set(
    Array.from(vocaByDate.values()).flatMap(a => a.missedIds)
  )];
  const { data: vocabEntries } = missedEntryIds.length
    ? await supabaseSFv2.schema('vocab').from('entries').select('id, term').in('id', missedEntryIds)
    : { data: [] };
  const termMap = new Map<string, string>();
  for (const en of vocabEntries ?? []) {
    if (en.id && en.term) termMap.set(en.id as string, en.term as string);
  }

  await Promise.all(
    Array.from(vocaByDate.entries()).map(async ([date, agg]) => {
      const wordCount = agg.entryIds.size;
      const accuracy = agg.gradedCount > 0
        ? Math.round((agg.correctCount / agg.gradedCount) * 100)
        : 0;
      const masteredCount = agg.masteredIds.size;
      const missedTerms = [...new Set(agg.missedIds)]
        .map(id => termMap.get(id))
        .filter((t): t is string => Boolean(t))
        .slice(0, VOCAB_MAX_MISSED);

      const narrative = await generateVocaNarrative({
        wordCount, gradedCount: agg.gradedCount, correctCount: agg.correctCount, accuracy, masteredCount, missedTerms,
      });

      const item: VocaDay = {
        type: 'voca',
        wordCount,
        gradedCount: agg.gradedCount,
        correctCount: agg.correctCount,
        accuracy,
        masteredCount,
        missedTerms,
        aiNarrative: narrative,
      };
      getOrCreate(date).items.push(item);
    })
  );

  // 날짜 내림차순 정렬
  const days = Array.from(dayMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  const report: LearningReport = { days };
  return NextResponse.json(report);
}

