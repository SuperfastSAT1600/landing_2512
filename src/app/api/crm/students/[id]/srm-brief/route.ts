import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { anthropicErrorMessage } from '@/lib/anthropic-error';
import { getQwenAnthropicClient, qwenModel, isQwenConfigured } from '@/lib/qwen';
import { buildSrmReport } from '@/lib/build-srm-report';
import type { LearningReport, DayItem } from '@/types/srm-portal';

export const maxDuration = 60;

// 품질 우선(종합·통찰). 무거운 편이나 결과는 데이터 지표 해시로 캐시되어 반복 열람은 즉시.
const MODEL = qwenModel('strong');
const CACHE_ITEM = 'situation_brief';

export interface SrmBriefData {
  headline: string;
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  recommendation: string;
}

const SYSTEM = `당신은 SuperfastSAT의 최고 학습 코치다. 한 학생의 학습 데이터(스터디홀·테스트센터·단어·코치 피드백·일간 리포트)를 종합해, 시간 없는 담당자가 3초 만에 "이 학생이 지금 어떤 상황이고 무엇을 해야 하는지" 파악하도록 스캔용 브리핑을 만든다.

출력은 오직 JSON 하나. 형식:
{"headline": "현재 상황을 관통하는 한 줄(25자 내외, 수치 나열 금지·핵심 진단)", "strengths": ["항목", ...], "weaknesses": ["항목", ...], "risks": ["항목", ...], "recommendation": "지금 취할 가장 임팩트 큰 액션 한 문장"}

분석 원칙(품질 기준):
- 수치를 나열하지 말고 해석하라. "무엇이 왜 그런지", 데이터 간 연결(예: 연습 정답률은 높은데 실전에서 급락 → 시간압박/실전감각 문제)을 짚어라.
- 추세를 반영하라. 최근이 이전보다 나아지는지/정체인지/나빠지는지 명시(예: "최근 2주 문법 정답률 43→58% 반등").
- 코치 피드백과 수치를 교차 검증하라. 코치가 지적한 것이 데이터로도 보이면 신뢰도 높게, 어긋나면 그 불일치를 언급.
- 우선순위를 매겨라. 강점·취약·리스크는 임팩트 큰 순서로. recommendation은 지금 단 하나의 최우선 행동.
- 각 항목은 구체적·근거 기반. 일반론("성실하다","노력이 필요하다") 금지. 스킬명·정답률·날짜·코치 발언을 인용하듯.

규칙: strengths·weaknesses 각 3~4개, risks 0~3개(없으면 빈 배열), 한 항목은 한 줄(35자 내외). 한국어. JSON 외 텍스트·코드펜스 절대 금지.`;

const LABELS: Record<DayItem['type'], string> = {
  study_hall: 'Study Hall', test_center: '테스트센터', voca: '단어', lesson_feedback: '레슨 피드백', daily_report: '일간 리포트',
};

function trunc(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

// 일자 집합에 대한 Study Hall 문제 가중 정답률
function shAcc(days: LearningReport['days']): number | null {
  let prob = 0, correct = 0;
  for (const d of days) for (const it of d.items) if (it.type === 'study_hall') { prob += it.totalProblems; correct += it.correctCount; }
  return prob ? Math.round((correct / prob) * 100) : null;
}
function vocaAcc(days: LearningReport['days']): number | null {
  let graded = 0, correct = 0;
  for (const d of days) for (const it of d.items) if (it.type === 'voca') { graded += it.gradedCount; correct += it.correctCount; }
  return graded ? Math.round((correct / graded) * 100) : null;
}
function skillLines(skillMap: Map<string, { correct: number; total: number }>): string[] {
  return [...skillMap.entries()]
    .filter(([, v]) => v.total >= 3)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total) // 취약 순
    .slice(0, 10)
    .map(([k, v]) => `${k} ${Math.round((v.correct / v.total) * 100)}%(${v.total}문항)`);
}

// LearningReport → LLM용 컨텍스트 (통찰을 유도하도록 추세·교차신호 포함)
function summarize(r: LearningReport, name: string): string {
  const days = r.days; // 최신순
  const items = days.flatMap((d) => d.items);
  const L: string[] = [`학생: ${name}`];
  if (days.length) L.push(`학습 기록: ${days.length}일 (${days[days.length - 1].date} ~ ${days[0].date}), 마지막 학습일 ${days[0].date}`);
  const now = Date.now();
  const active14 = days.filter((d) => (now - new Date(d.date + 'T00:00:00').getTime()) / 86400000 <= 14).length;
  L.push(`최근 14일 학습일수: ${active14}일 · 누적 노출 단어: ${r.vocabExposedCount}개`);

  const sh = items.filter((i): i is Extract<DayItem, { type: 'study_hall' }> => i.type === 'study_hall');
  const tc = items.filter((i): i is Extract<DayItem, { type: 'test_center' }> => i.type === 'test_center');

  if (sh.length) {
    const min = sh.reduce((s, i) => s + i.durationMinutes, 0);
    const prob = sh.reduce((s, i) => s + i.totalProblems, 0);
    const correct = sh.reduce((s, i) => s + i.correctCount, 0);
    const m = new Map<string, { correct: number; total: number }>();
    for (const i of sh) for (const sk of i.skills ?? []) { const e = m.get(sk.skill) ?? { correct: 0, total: 0 }; e.correct += sk.correct; e.total += sk.total; m.set(sk.skill, e); }
    L.push(`\n[Study Hall(연습)] ${sh.length}세션 · ${min}분 · 문제 ${prob} · 정답률 ${prob ? Math.round((correct / prob) * 100) : 0}%`);
    const sl = skillLines(m);
    if (sl.length) L.push(`스킬별 정답률(취약순): ${sl.join(', ')}`);
  }

  if (tc.length) {
    const score = tc.reduce((s, i) => s + i.totalScore, 0);
    const prob = tc.reduce((s, i) => s + i.totalProblems, 0);
    const curs = [...new Set(tc.map((i) => i.curriculumTitle).filter(Boolean))].slice(0, 6);
    const m = new Map<string, { correct: number; total: number }>();
    for (const i of tc) for (const sk of i.skills ?? []) { const e = m.get(sk.skill) ?? { correct: 0, total: 0 }; e.correct += sk.correct; e.total += sk.total; m.set(sk.skill, e); }
    L.push(`\n[테스트센터(실전)] ${tc.length}세션 · 문제 ${prob} · 평균 정답률 ${prob ? Math.round((score / prob) * 100) : 0}%`);
    if (curs.length) L.push(`다룬 커리큘럼: ${curs.join(', ')}`);
    const sl = skillLines(m);
    if (sl.length) L.push(`실전 스킬별 정답률(취약순): ${sl.join(', ')}`);
  }

  // 연습 vs 실전 격차 (핵심 교차신호)
  const shA = shAcc(days);
  const tcA = tc.length ? Math.round((tc.reduce((s, i) => s + i.totalScore, 0) / Math.max(1, tc.reduce((s, i) => s + i.totalProblems, 0))) * 100) : null;
  if (shA != null && tcA != null) L.push(`\n[연습 vs 실전] 스터디홀 ${shA}% vs 테스트센터 ${tcA}% → 격차 ${shA - tcA}%p ${shA - tcA >= 12 ? '(실전에서 급락 — 시간압박·실전감각 의심)' : ''}`);

  // 추세 (이전 절반 → 최근 절반)
  if (days.length >= 4) {
    const mid = Math.ceil(days.length / 2);
    const recent = days.slice(0, mid), earlier = days.slice(mid);
    const t: string[] = [];
    const rSH = shAcc(recent), eSH = shAcc(earlier);
    if (rSH != null && eSH != null) t.push(`스터디홀 정답률 이전 ${eSH}% → 최근 ${rSH}% (${rSH - eSH >= 0 ? '+' : ''}${rSH - eSH}%p)`);
    const rV = vocaAcc(recent), eV = vocaAcc(earlier);
    if (rV != null && eV != null) t.push(`단어 정답률 이전 ${eV}% → 최근 ${rV}% (${rV - eV >= 0 ? '+' : ''}${rV - eV}%p)`);
    if (t.length) L.push(`\n[추세(이전 절반 → 최근 절반)]\n${t.join('\n')}`);
  }

  const vc = items.filter((i): i is Extract<DayItem, { type: 'voca' }> => i.type === 'voca');
  if (vc.length) {
    const words = vc.reduce((s, i) => s + i.wordCount, 0);
    const mastered = vc.reduce((s, i) => s + i.masteredCount, 0);
    const graded = vc.reduce((s, i) => s + i.gradedCount, 0);
    const correct = vc.reduce((s, i) => s + i.correctCount, 0);
    const missed = [...new Set(vc.flatMap((i) => i.missedTerms))].slice(0, 15);
    L.push(`\n[단어] 학습 ${words}개 · 마스터 ${mastered}개 · 정답률 ${graded ? Math.round((correct / graded) * 100) : 0}%`);
    if (missed.length) L.push(`최근 틀린 단어: ${missed.join(', ')}`);
  }

  const lf = items.filter((i): i is Extract<DayItem, { type: 'lesson_feedback' }> => i.type === 'lesson_feedback')
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt)).slice(0, 5);
  if (lf.length) L.push(`\n[최근 코치 피드백]\n${lf.map((f) => `- (${f.startsAt.slice(0, 10)}${f.coachName ? ` ${f.coachName}` : ''}) ${trunc(f.feedback, 700)}`).join('\n')}`);

  const dr = items.filter((i): i is Extract<DayItem, { type: 'daily_report' }> => i.type === 'daily_report').slice(0, 2);
  if (dr.length) L.push(`\n[최근 일간 리포트]\n${dr.map((d) => `- ${trunc(d.reportMd, 600)}`).join('\n')}`);

  L.push(`\n[최근 학습 패턴]\n${days.slice(0, 10).map((d) => `${d.date}: ${d.items.map((i) => LABELS[i.type]).join(', ')}`).join('\n')}`);
  return L.join('\n');
}

function parseBrief(text: string): SrmBriefData | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1));
    const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
    return {
      headline: String(o.headline ?? ''),
      strengths: arr(o.strengths),
      weaknesses: arr(o.weaknesses),
      risks: arr(o.risks),
      recommendation: String(o.recommendation ?? ''),
    };
  } catch {
    return null;
  }
}

// POST /api/crm/students/:id/srm-brief[?refresh=1] → { data: { brief, cached } }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' } }, { status: 401 });
  }
  if (!isQwenConfigured()) {
    return NextResponse.json({ error: { message: 'AI가 설정되지 않았습니다.' } }, { status: 503 });
  }
  const refresh = new URL(request.url).searchParams.get('refresh') === '1';

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select('name, sfv2_profile_id')
    .eq('id', id)
    .single();
  if (error || !student) {
    return NextResponse.json({ error: { message: '학생을 찾을 수 없습니다.' } }, { status: 404 });
  }
  const profileId = (student as { sfv2_profile_id?: string | null }).sfv2_profile_id;
  if (!profileId) {
    return NextResponse.json({ error: { code: 'no_v2_profile', message: 'SRM 프로필이 연결되지 않았습니다.' } }, { status: 404 });
  }

  try {
    const report = await buildSrmReport(profileId, { skipNarratives: true });
    if (report.days.length === 0) {
      return NextResponse.json({ error: { message: '학습 기록이 없어 브리핑을 만들 수 없습니다.' } }, { status: 422 });
    }
    const context = summarize(report, (student as { name: string }).name);
    const inputHash = createHash('sha256').update(context).digest('hex').slice(0, 16);
    const reportDate = report.days[0]?.date ?? 'latest';

    // 캐시 조회 (데이터 지표가 그대로면 LLM 없이 즉시 반환)
    if (!refresh) {
      const { data: cached } = await supabaseAdmin
        .from('portal_narrative_cache')
        .select('narrative')
        .eq('profile_id', profileId)
        .eq('item_type', CACHE_ITEM)
        .eq('input_hash', inputHash)
        .maybeSingle();
      if (cached?.narrative) {
        try {
          return NextResponse.json({ data: { brief: JSON.parse(cached.narrative) as SrmBriefData, cached: true } });
        } catch { /* 손상 캐시 → 재생성 */ }
      }
    }

    const client = getQwenAnthropicClient();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1400,
      system: [{ type: 'text', text: SYSTEM }],
      messages: [{ role: 'user', content: `아래 학습 데이터를 종합해 학생의 현재 상황 브리핑을 JSON으로만 답하라.\n\n${context}` }],
    });
    const text = resp.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
    const brief = parseBrief(text);
    if (!brief || !brief.headline) {
      return NextResponse.json({ error: { message: 'AI 응답을 해석하지 못했습니다.' } }, { status: 502 });
    }

    // 캐시 저장 (best-effort)
    await supabaseAdmin
      .from('portal_narrative_cache')
      .upsert({ profile_id: profileId, report_date: reportDate, item_type: CACHE_ITEM, input_hash: inputHash, narrative: JSON.stringify(brief) })
      .match({ profile_id: profileId, report_date: reportDate, item_type: CACHE_ITEM, input_hash: inputHash });

    return NextResponse.json({ data: { brief, cached: false } });
  } catch (err) {
    console.error('[srm-brief]', err);
    return NextResponse.json({ error: { message: anthropicErrorMessage(err) } }, { status: 502 });
  }
}
