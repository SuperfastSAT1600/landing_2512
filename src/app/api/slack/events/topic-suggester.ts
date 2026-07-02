import { createClient } from '@supabase/supabase-js';
import type { Topic } from './blog-writer';

// ─── 캘린더 (blog-agent/data/sat-calendar.json 인라인) ───────────────────────

const SAT_TESTS: { date: string; name: string; topic_hints: Record<string, string[]> }[] = [
  {
    date: '2026-08-29', name: 'SAT August 2026',
    topic_hints: {
      D30: ['여름방학 마지막 SAT 스퍼트 전략', '8월 SAT 한 달 전 점검 리스트', '여름방학 SAT 준비 실수 TOP 5'],
      D14: ['SAT 2주 전 최고 효율 학습법', '시험 직전 어휘 암기 전략', 'Reading 시간 관리 최종 점검'],
      D7: ['SAT 1주일 전 해야 할 것 vs 하지 말 것', '시험 전날 루틴 가이드', '멘탈 관리: 시험 불안을 이기는 법'],
      D7_after: ['8월 SAT 시험 후 점수 해석하는 법', 'SAT 재시험 결정 가이드'],
    },
  },
  {
    date: '2026-10-03', name: 'SAT October 2026',
    topic_hints: {
      D30: ['10월 SAT 한 달 전략', '학기 중 SAT 병행하는 법', '가을 SAT 목표 점수 설정 가이드'],
      D14: ['SAT 2주 전 약점 스킬 집중 공략법', 'Math vs RW 마지막 2주 배분 전략', 'Words in Context 최빈출 패턴 최종 정리'],
      D7: ['SAT 1주일 전 모의고사 활용법', '10월 SAT 최종 체크리스트', '시험 전 수면·식단 관리'],
      D7_after: ['10월 SAT 점수 분석 방법', '낮은 점수 나왔을 때 대처법'],
    },
  },
  {
    date: '2026-11-07', name: 'SAT November 2026',
    topic_hints: {
      D30: ['11월 SAT 대비 10월 학습 계획', '대입 원서와 SAT 동시 준비 전략', '가을 마지막 SAT 고득점 전략'],
      D14: ['SAT 고득점자 2주 전 루틴 공개', 'RW 1550+ 가르는 핵심 스킬', '수능 이후 SAT 준비 전환 전략'],
      D7: ['11월 SAT 최종 준비 가이드', '시험 전 1주일 복습 우선순위'],
      D7_after: ['11월 SAT 이후 대입 타임라인 점검'],
    },
  },
  {
    date: '2026-12-05', name: 'SAT December 2026',
    topic_hints: {
      D30: ['12월 SAT 준비: 겨울방학 전 마지막 기회', '연말 SAT 집중 공략법', '12월 SAT가 마지막인 학생을 위한 가이드'],
      D14: ['2주 만에 SAT 점수 올리는 현실적인 방법', '12월 SAT 고득점 스킬 압축 정리'],
      D7: ['마지막 SAT 1주일 전 할 일', '12월 SAT 최종 점검 리스트'],
      D7_after: ['12월 SAT 이후 대입 전략 재수립'],
    },
  },
  {
    date: '2027-03-13', name: 'SAT March 2027',
    topic_hints: {
      D30: ['봄 SAT 한 달 전 전략 수립', '3월 SAT를 노리는 이유와 준비법', '겨울방학 SAT 집중 훈련 결과 점검'],
      D14: ['3월 SAT 최종 2주 스프린트', 'Reading 지문 구조 내재화 최종 점검'],
      D7: ['3월 SAT 1주일 전 가이드'],
      D7_after: ['3월 SAT 결과로 여름 계획 세우기'],
    },
  },
];

// ─── 코치 인사이트 고정 주제 ──────────────────────────────────────────────────

const COACH_TOPICS: Omit<Topic, 'n'>[] = [
  { title: 'SAT 점수가 오르지 않는 진짜 이유 — 노력이 아닌 방법의 문제', rationale: '코칭 철학 "우리가 생각하는 학생" 기반 — 경쟁사가 쓸 수 없는 관점', point: '학원 철학을 콘텐츠로 전환, 상담 전환율 향상' },
  { title: 'SAT 코치가 문제를 풀어주지 않는 이유', rationale: '코칭 철학 "코치의 역할" 기반 — 경쟁사가 쓸 수 없는 관점', point: '코치 포지셔닝 명확화, 프리미엄 서비스 차별화' },
  { title: 'SAT RW는 지문을 많이 읽는다고 점수가 오르지 않는 이유', rationale: '코칭 철학 "내용 암기보다 구조 인식" 기반 — 경쟁사가 쓸 수 없는 관점', point: '독자 기존 학습법 반박 → 새 방법론 제시 → 전환율' },
  { title: '"틀렸다"는 말이 왜 쓸모없는가 — SAT 오답 분석의 기준', rationale: '코칭 철학 "오류 유형이 분석의 단위" 기반 — 경쟁사가 쓸 수 없는 관점', point: '데이터 기반 코칭 차별화 포인트 부각' },
  { title: '스터디홀에서 잘 되는데 실전에서 무너지는 이유', rationale: '코칭 철학 "연습과 검증은 다른 행위다" 기반 — 경쟁사가 쓸 수 없는 관점', point: '독자가 경험한 좌절감과 직결, 즉각 공감 유발' },
  { title: 'SAT 단어 암기를 시작하기 전에 반드시 해야 할 것', rationale: '코칭 철학 "단어는 진단 후 처방이다" 기반 — 경쟁사가 쓸 수 없는 관점', point: 'vocab 콘텐츠 진입점, 단어장 제품 연결 가능' },
  { title: 'SAT 준비 첫 번째 단계가 문제풀이가 되면 안 되는 이유', rationale: '코칭 철학 "진단에서 시작한다" 기반 — 경쟁사가 쓸 수 없는 관점', point: '진단 테스트 상품 연결 + 차별화 커리큘럼 소개' },
  { title: 'SAT 점수를 스킬 단위로 관리해야 하는 이유', rationale: '코칭 철학 "스킬 단위로 쌓는다" 기반 — 경쟁사가 쓸 수 없는 관점', point: '체계적 접근법 시각화, 학습 로드맵 콘텐츠' },
  { title: 'SuperfastSAT 한 사이클이란 무엇인가 — 학습 단위 설계 원칙', rationale: '코칭 철학 "한 사이클의 단위" 기반 — 경쟁사가 쓸 수 없는 관점', point: '커리큘럼 투명성 공개, 신뢰 구축' },
  { title: 'SAT 학습 리포트를 제대로 읽는 법', rationale: '코칭 철학 "리포트가 이 철학을 구현하는 방식" 기반 — 경쟁사가 쓸 수 없는 관점', point: '기존 수강생 재참여 + 잠재 고객에게 시스템 소개' },
];

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function diffDays(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getCalendarTopics(): Omit<Topic, 'n'>[] {
  const results: Omit<Topic, 'n'>[] = [];
  for (const test of SAT_TESTS) {
    const days = diffDays(test.date);
    let bracket: string | null = null;
    if (days >= 0 && days <= 7) bracket = 'D7';
    else if (days > 7 && days <= 14) bracket = 'D14';
    else if (days > 14 && days <= 30) bracket = 'D30';
    else if (days < 0 && days >= -7) bracket = 'D7_after';
    if (!bracket) continue;
    for (const hint of test.topic_hints[bracket] ?? []) {
      const label = days >= 0 ? `D-${days} (${test.name})` : `D+${Math.abs(days)} (${test.name} 직후)`;
      results.push({ title: hint, rationale: `${test.name} ${label} — 독자 관심도 최고 구간`, point: '시험 임박 독자 유입 + 브랜드 신뢰도 구축' });
    }
    if (results.length >= 3) break;
  }
  return results;
}

async function getStudentDataTopics(): Promise<Omit<Topic, 'n'>[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const supabase = createClient(url, key);
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const { data, error } = await supabase
      .from('diagnostic_test_results')
      .select('skill_scores')
      .gte('created_at', since.toISOString())
      .limit(100);
    if (error || !data?.length) return [];

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

    return Object.entries(skillErrors)
      .filter(([, v]) => v.total >= 3)
      .map(([skill, v]) => ({ skill, rate: v.errors / v.total }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3)
      .map(({ skill, rate }) => ({
        title: `SAT ${skill} — 학생들이 가장 많이 틀리는 이유`,
        rationale: `최근 2주 수강생 오답률 ${Math.round(rate * 100)}% — 실제 데이터 기반 주제`,
        point: '검증된 학습 데이터로 신뢰도 극대화, 독자 공감 유발',
      }));
  } catch {
    return [];
  }
}

// ─── Public ───────────────────────────────────────────────────────────────────

export async function generateTopics(n: number): Promise<Topic[]> {
  const pool: Omit<Topic, 'n'>[] = [];

  pool.push(...getCalendarTopics());
  if (pool.length < n) pool.push(...(await getStudentDataTopics()));
  if (pool.length < n) pool.push(...COACH_TOPICS);

  return pool.slice(0, n).map((t, i) => ({ ...t, n: i + 1 }));
}

export function buildTopicMessage(topics: Topic[]): string {
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });
  let msg = `[오늘의 블로그 주제 제안 — ${dateStr}]\n\n`;
  topics.forEach((t, i) => {
    msg += `${i + 1}. ${t.title}\n`;
    msg += `   근거: ${t.rationale}\n`;
    msg += `   포인트: ${t.point}\n`;
    if (i < topics.length - 1) msg += '\n';
  });
  msg += '\n\n→ 이 채널에서 @landingpage N번 써줘 를 입력하면 바로 시작합니다.';
  return msg;
}
