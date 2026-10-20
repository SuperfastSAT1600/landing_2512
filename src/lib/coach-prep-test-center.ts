import type { DayItem } from '@/types/srm-portal';
import { tcSectionScore, RW_DOMAINS, MATH_DOMAINS } from '@/lib/sat-score-estimate';

const WEAK_ACCURACY = 60;
const MIN_SKILL_SAMPLE = 3;

export const DOMAIN_LABELS: Record<string, string> = {
  information_and_ideas: 'Information and Ideas',
  craft_and_structure: 'Craft and Structure',
  expression_of_ideas: 'Expression of Ideas',
  standard_english_conventions: 'Standard English Conventions',
  algebra: 'Algebra',
  advanced_math: 'Advanced Math',
  problem_solving_and_data_analysis: 'Problem-Solving and Data Analysis',
  geometry_and_trigonometry: 'Geometry and Trigonometry',
};

export interface TcSkillStat {
  skill: string;
  correct: number;
  total: number;
  accuracy: number;
  lowSample: boolean;
  weak: boolean;
}

export interface TcDomainStat {
  domain: string;
  section: 'rw' | 'math' | null;
  correct: number;
  total: number;
  accuracy: number;
  skills: TcSkillStat[];
}

export interface TcSession {
  date: string;
  title: string;
  score: number;
  total: number;
  accuracy: number;
  rwScore: number | null;
  mathScore: number | null;
  /** true면 rwScore/mathScore가 모듈을 다 풀지 않은 상태의 참고 점수 */
  rwPartial: boolean;
  mathPartial: boolean;
  totalScore: number | null;
  /** 카드 맨 위에 크게 보여줄 점수. label이 있으면 정식 합계가 아니라는 뜻 */
  headline: { value: number; label: string | null } | null;
  domains: TcDomainStat[];
}

type TcItem = Extract<DayItem, { type: 'test_center' }>;

const pct = (correct: number, total: number) => (total ? Math.round((correct / total) * 100) : 0);

function sectionOf(domain: string): 'rw' | 'math' | null {
  if (RW_DOMAINS.has(domain)) return 'rw';
  if (MATH_DOMAINS.has(domain)) return 'math';
  return null;
}

// 도메인 표기가 데이터마다 다르다("Problem-Solving and Data Analysis" / problem_solving_and_data_analysis) — snake_case로 통일
const domainKey = (d: string) => d.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function buildDomains(skills: NonNullable<TcItem['skills']>): TcDomainStat[] {
  const byDomain = new Map<string, Map<string, { c: number; t: number }>>();
  for (const sk of skills) {
    const key = domainKey(sk.domain);
    const bySkill = byDomain.get(key) ?? new Map();
    const e = bySkill.get(sk.skill) ?? { c: 0, t: 0 };
    e.c += sk.correct;
    e.t += sk.total;
    bySkill.set(sk.skill, e);
    byDomain.set(key, bySkill);
  }

  const domains: TcDomainStat[] = [];
  for (const [domain, bySkill] of byDomain) {
    const stats: TcSkillStat[] = [...bySkill].map(([skill, { c, t }]) => {
      const accuracy = pct(c, t);
      const lowSample = t < MIN_SKILL_SAMPLE;
      return { skill, correct: c, total: t, accuracy, lowSample, weak: !lowSample && accuracy < WEAK_ACCURACY };
    });
    stats.sort((a, b) => a.accuracy - b.accuracy);
    const correct = stats.reduce((n, s) => n + s.correct, 0);
    const total = stats.reduce((n, s) => n + s.total, 0);
    domains.push({ domain, section: sectionOf(domain), correct, total, accuracy: pct(correct, total), skills: stats });
  }
  return domains.sort((a, b) => a.accuracy - b.accuracy);
}

function headlineOf(rw: number | null, math: number | null, rwPartial: boolean, mathPartial: boolean, total: number | null) {
  if (rw != null && math != null) {
    return rwPartial || mathPartial ? { value: rw + math, label: '일부 모듈 응시 · 예상' } : { value: total ?? rw + math, label: null };
  }
  if (rw != null) return { value: rw, label: rwPartial ? 'RW 일부 모듈 응시 · 예상' : 'RW만 응시 · 예상' };
  if (math != null) return { value: math, label: mathPartial ? 'Math 일부 모듈 응시 · 예상' : 'Math만 응시 · 예상' };
  return null;
}

export function buildTcSessions(days: { date: string; items: DayItem[] }[]): TcSession[] {
  const sessions: TcSession[] = [];
  for (const day of days) {
    for (const item of day.items) {
      if (item.type !== 'test_center' || item.totalProblems <= 0) continue;
      const sec = tcSectionScore(item);
      const rwScore = sec.rwScaled ?? sec.rwEstimate;
      const mathScore = sec.mathScaled ?? sec.mathEstimate;
      const rwPartial = sec.rwScaled == null && sec.rwEstimate != null;
      const mathPartial = sec.mathScaled == null && sec.mathEstimate != null;
      sessions.push({
        date: day.date,
        title: item.curriculumTitle ?? '모의고사',
        score: item.totalScore,
        total: item.totalProblems,
        accuracy: pct(item.totalScore, item.totalProblems),
        rwScore,
        mathScore,
        rwPartial,
        mathPartial,
        totalScore: rwPartial || mathPartial ? null : sec.total,
        headline: headlineOf(rwScore, mathScore, rwPartial, mathPartial, sec.total),
        domains: buildDomains(item.skills ?? []),
      });
    }
  }
  return sessions.sort((a, b) => a.date.localeCompare(b.date));
}
