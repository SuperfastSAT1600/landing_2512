import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { Topic } from './blog-writer';

export type RichTopic = Topic & {
  type: '현상형' | '전략형' | '개념형' | '비교형' | '오류수정형';
  confusion_scene: string;
  existing_belief: string;
  reversal: string;
  opening_claim: string;
  reader_delta: string;
  fm_score: 'high' | 'medium' | 'low';
};

// ─── SAT 시험 캘린더 (컨텍스트용) ────────────────────────────────────────────

const SAT_TESTS = [
  { date: '2026-08-29', name: 'SAT August 2026' },
  { date: '2026-10-03', name: 'SAT October 2026' },
  { date: '2026-11-07', name: 'SAT November 2026' },
  { date: '2026-12-05', name: 'SAT December 2026' },
  { date: '2027-03-13', name: 'SAT March 2027' },
];

function getCalendarContext(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const lines: string[] = [];
  for (const test of SAT_TESTS) {
    const target = new Date(test.date);
    target.setHours(0, 0, 0, 0);
    const days = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days >= -7 && days <= 60) {
      const label = days >= 0 ? `D-${days}` : `D+${Math.abs(days)} (시험 직후)`;
      lines.push(`${test.name}: ${label}`);
    }
  }
  return lines.length ? lines.join(', ') : '현재 시험 임박 구간 없음';
}

// ─── 학생 오답 데이터 ──────────────────────────────────────────────────────────

async function getStudentSkillContext(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return '학생 데이터 없음';
  try {
    const supabase = createClient(url, key);
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const { data, error } = await supabase
      .from('diagnostic_test_results')
      .select('skill_scores')
      .gte('created_at', since.toISOString())
      .limit(100);
    if (error || !data?.length) return '학생 데이터 없음 (최근 2주 진단 없음)';

    const skillErrors: Record<string, { total: number; errors: number }> = {};
    for (const row of data) {
      const scores = row.skill_scores as Record<string, number> | null;
      if (!scores) continue;
      for (const [skill, score] of Object.entries(scores)) {
        if (!skillErrors[skill]) skillErrors[skill] = { total: 0, errors: 0 };
        skillErrors[skill].total++;
        if (score < 0.6) skillErrors[skill].errors++;
      }
    }
    const top = Object.entries(skillErrors)
      .filter(([, v]) => v.total >= 3)
      .map(([skill, v]) => ({ skill, rate: v.errors / v.total }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
    if (!top.length) return '학생 데이터 없음 (샘플 부족)';
    return top.map(({ skill, rate }) => `${skill} (오답률 ${Math.round(rate * 100)}%)`).join(', ');
  } catch {
    return '학생 데이터 조회 실패';
  }
}

// ─── 기발행 주제 목록 (중복 방지) ────────────────────────────────────────────

async function getRecentPublishedTitles(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const supabase = createClient(url, key);
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data } = await supabase
      .from('posts')
      .select('title')
      .gte('created_at', since.toISOString())
      .limit(50);
    return (data ?? []).map((r: { title: string }) => r.title).filter(Boolean);
  } catch {
    return [];
  }
}

// ─── Claude API 주제 생성 ─────────────────────────────────────────────────────

const TOPIC_SYSTEM = `당신은 SuperfastSAT 블로그 주제 전략가입니다.

[SuperfastSAT 코치 철학 — 경쟁사 차별화 원칙]
- 진단에서 시작한다: 문제풀이 전에 스킬 단위 진단이 먼저다
- 스킬 단위로 쌓는다: 전체 점수가 아닌 스킬별 오류 유형이 분석 단위다
- 연습과 검증은 다른 행위다: 스터디홀(연습)과 테스트센터(검증)를 분리한다
- 내용 암기보다 구조 인식: RW는 지문 내용이 아닌 출제 패턴을 인식하는 능력이다
- 코치의 역할은 문제를 풀어주는 것이 아니다: 오류 유형을 찾아 처방한다

[좋은 블로그 주제 조건 — FM 구조]
좋은 주제 = "독자가 X라고 믿는데, 실제로는 Y이다 (College Board 데이터나 코치 경험으로 증명 가능) + 이 반전 후 독자 행동이 구체적으로 바뀐다"

fm_score 기준:
- high: 혼란 장면이 구체적, 반전이 데이터/메커니즘으로 증명 가능, 독자 행동 동사가 명확
- medium: 혼란 장면은 있으나 반전 근거가 약하거나 독자 델타가 모호
- low: 반전이 없는 정보 나열 / 독자 행동 변화 없음 / 경쟁사도 쓸 수 있는 관점

[포스팅 5유형]
- 현상형: 독자가 모르는 패턴/사실을 데이터로 보여줌 (메커니즘 주어 = College Board / 출제 설계)
- 전략형: 공부법/풀이법 제시 (독자 주어 가능)
- 개념형: 헷갈리는 개념 구분
- 비교형: A vs B 선택 기준
- 오류수정형: 자주 하는 실수 교정

반드시 JSON 배열만 반환하세요. 마크다운 코드블록 없이.`;

async function callClaudeForTopics(
  n: number,
  context: { calendar: string; skills: string; recentTitles: string[]; excludeTypes?: string[] }
): Promise<RichTopic[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const recentStr = context.recentTitles.length
    ? `최근 30일 발행 주제 (중복 금지):\n${context.recentTitles.map(t => `- ${t}`).join('\n')}`
    : '최근 발행 주제 없음';

  const excludeStr = context.excludeTypes?.length
    ? `이미 선정된 유형 (다른 유형으로 생성): ${context.excludeTypes.join(', ')}`
    : '';

  const today = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  const userMessage = `오늘: ${today}
SAT 시험 D-day: ${context.calendar}
학생 오답률 높은 스킬: ${context.skills}
${recentStr}
${excludeStr}

위 컨텍스트를 바탕으로 fm_score가 high 또는 medium인 블로그 주제 ${n}개를 생성하세요.
5유형을 고르게 분배하고, 경쟁사가 쓸 수 없는 SuperfastSAT 관점을 우선하세요.

반환 형식 (JSON 배열):
[
  {
    "title": "포스팅 제목",
    "type": "현상형|전략형|개념형|비교형|오류수정형",
    "confusion_scene": "독자가 실제로 겪는 혼란 장면 1~2줄",
    "existing_belief": "독자의 현재 믿음 (반전의 출발점)",
    "reversal": "실제로는 Y이다 — 데이터/메커니즘 기반",
    "opening_claim": "오프닝 주장 한 문장",
    "reader_delta": "이 글을 읽은 독자는 [구체 행동 동사]할 것이다",
    "fm_score": "high|medium|low",
    "rationale": "근거 요약 (1줄)",
    "point": "핵심 포인트 (1줄)"
  }
]`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: TOPIC_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
  const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
  const start = stripped.indexOf('[');
  const end = stripped.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  try {
    return JSON.parse(stripped.slice(start, end + 1)) as RichTopic[];
  } catch {
    return [];
  }
}

// ─── 필터 + 균형 ──────────────────────────────────────────────────────────────

function filterAndBalance(topics: RichTopic[], n: number): RichTopic[] {
  const filtered = topics.filter(t => t.fm_score !== 'low');
  const typeCounts: Record<string, number> = {};
  const balanced: RichTopic[] = [];
  for (const t of filtered) {
    typeCounts[t.type] = (typeCounts[t.type] ?? 0) + 1;
    if (typeCounts[t.type] <= 2) balanced.push(t);
    if (balanced.length >= n) break;
  }
  return balanced;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function generateTopics(n: number): Promise<RichTopic[]> {
  const [calendar, skills, recentTitles] = await Promise.all([
    Promise.resolve(getCalendarContext()),
    getStudentSkillContext(),
    getRecentPublishedTitles(),
  ]);

  const ctx = { calendar, skills, recentTitles };

  let results = filterAndBalance(await callClaudeForTopics(n + 3, ctx), n);

  // 부족하면 재시도 (최대 2회)
  for (let retry = 0; retry < 2 && results.length < n; retry++) {
    const usedTypes = results.map(t => t.type);
    const extra = filterAndBalance(
      await callClaudeForTopics(n - results.length + 2, { ...ctx, excludeTypes: usedTypes }),
      n - results.length
    );
    results = [...results, ...extra];
  }

  // 그래도 부족하면 medium 포함 fallback
  if (results.length < n) {
    const fallback = await callClaudeForTopics(n, ctx);
    results = fallback.filter(t => t.fm_score !== 'low').slice(0, n);
  }

  return results.slice(0, n).map((t, i) => ({ ...t, n: i + 1 }));
}

export function buildTopicMessage(topics: RichTopic[]): string {
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
  let msg = `[오늘의 블로그 주제 제안 — ${dateStr}]\n\n`;
  topics.forEach((t, i) => {
    const fm = t.fm_score === 'high' ? '높음' : '보통';
    msg += `${i + 1}. ${t.title}\n`;
    msg += `   유형: ${t.type} | FM 가능성: ${fm}\n`;
    msg += `   혼란 장면: ${t.confusion_scene}\n`;
    msg += `   오프닝 주장: ${t.opening_claim}\n`;
    msg += `   독자 델타: ${t.reader_delta}\n`;
    if (i < topics.length - 1) msg += '\n';
  });
  msg += '\n\n→ 이 채널에서 @landingpage N번 써줘 를 입력하면 바로 시작합니다.';
  return msg;
}
