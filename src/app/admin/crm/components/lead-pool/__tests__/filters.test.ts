import type { Student } from '@/types/crm';
import {
  CHURN_STAGE_NONE,
  DEFAULT_FILTERS,
  buildChurnStageGroups,
  churnedDaysAgo,
  computeSuccessRate,
  filterInactiveStudents,
  listGradeOptions,
  matchesFilters,
  splitByLeadStatus,
  type LeadPoolFilters,
} from '../filters';
import { lastConsultationSnippet } from '../StudentPoolCard';

const DAY_MS = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString();

function student(over: Record<string, unknown>): Student {
  return {
    id: 'x',
    name: 'x',
    grade: '11',
    lead_status: 'inactive',
    churn_tag: null,
    churn_type: null,
    traffic_source: null,
    updated_at: ago(10),
    stage_history: [],
    consultation_timeline: [],
    reactivation_log: [],
    ...over,
  } as unknown as Student;
}

const f = (over: Partial<LeadPoolFilters>): LeadPoolFilters => ({ ...DEFAULT_FILTERS, ...over });
const ids = (list: Student[]) => list.map((s) => s.id);

const A = student({
  id: 'a',
  grade: '11',
  churn_type: 'closed',
  churn_tag: '노쇼: 연락 두절',
  traffic_source: '소개',
  updated_at: ago(10),
  stage_history: [{ stage: '2' }, { stage: 'churned' }],
  consultation_timeline: [{ created_at: ago(1), ai_purified: 'Hello World', raw_memo: null }],
});
const B = student({
  id: 'b',
  grade: '10',
  churn_type: 'potential',
  churn_tag: '회신 없음',
  traffic_source: '인스타그램 광고',
  updated_at: ago(100),
  consultation_timeline: [{ created_at: ago(1), ai_purified: null, raw_memo: '영어 고민' }],
});
const C = student({ id: 'c', grade: '11', updated_at: ago(200), churn_stage_manual: '3a' });
const POOL = [A, B, C];

describe('filterInactiveStudents', () => {
  it('기본 필터는 전부 통과시킨다', () => {
    expect(ids(filterInactiveStudents(POOL, DEFAULT_FILTERS))).toEqual(['a', 'b', 'c']);
  });

  it('churnTag는 prefix 매칭이다', () => {
    expect(ids(filterInactiveStudents(POOL, f({ churnTag: '노쇼' })))).toEqual(['a']);
    expect(ids(filterInactiveStudents(POOL, f({ churnTag: '쇼' })))).toEqual([]);
    // churn_tag가 null이면 어떤 태그 필터에도 걸러진다
    expect(matchesFilters(C, f({ churnTag: '기타' }))).toBe(false);
  });

  it('churnType', () => {
    expect(ids(filterInactiveStudents(POOL, f({ churnType: 'potential' })))).toEqual(['b']);
  });

  it('churnStage: 단계 코드 / 수동 지정 우선 / 미상 sentinel', () => {
    expect(ids(filterInactiveStudents(POOL, f({ churnStage: '2' })))).toEqual(['a']);
    expect(ids(filterInactiveStudents(POOL, f({ churnStage: '3a' })))).toEqual(['c']);
    expect(ids(filterInactiveStudents(POOL, f({ churnStage: CHURN_STAGE_NONE })))).toEqual(['b']);
  });

  it('grade', () => {
    expect(ids(filterInactiveStudents(POOL, f({ grade: '11' })))).toEqual(['a', 'c']);
  });

  it('trafficSource', () => {
    expect(ids(filterInactiveStudents(POOL, f({ trafficSource: '소개' })))).toEqual(['a']);
  });

  it('daysSinceChurn은 경과일이 임계값 이하인 학생만 남긴다', () => {
    expect(ids(filterInactiveStudents(POOL, f({ daysSinceChurn: '30' })))).toEqual(['a']);
    expect(ids(filterInactiveStudents(POOL, f({ daysSinceChurn: '180' })))).toEqual(['a', 'b']);
  });

  it('keyword는 ai_purified와 raw_memo 모두에서 대소문자 무시로 찾는다', () => {
    expect(ids(filterInactiveStudents(POOL, f({ keyword: 'hello' })))).toEqual(['a']);
    expect(ids(filterInactiveStudents(POOL, f({ keyword: '고민' })))).toEqual(['b']);
    expect(ids(filterInactiveStudents(POOL, f({ keyword: '없는말' })))).toEqual([]);
  });

  it('여러 필터는 AND로 결합된다', () => {
    expect(ids(filterInactiveStudents(POOL, f({ grade: '11', churnType: 'closed' })))).toEqual([
      'a',
    ]);
  });
});

describe('splitByLeadStatus', () => {
  it('inactive / reactivating로 나누고 나머지는 버린다', () => {
    const r = student({ id: 'r', lead_status: 'reactivating' });
    const o = student({ id: 'o', lead_status: 'active' });
    const out = splitByLeadStatus([A, r, o]);
    expect(ids(out.inactive)).toEqual(['a']);
    expect(ids(out.reactivating)).toEqual(['r']);
  });
});

describe('buildChurnStageGroups', () => {
  it('퍼널 순서로 정렬하고 미상은 마지막에 붙인다', () => {
    const groups = buildChurnStageGroups([B, C, A, student({ id: 'd', churn_stage_manual: '2' })]);
    expect(groups.map((g) => [g.key, g.count])).toEqual([
      ['2', 2],
      ['3a', 1],
      [CHURN_STAGE_NONE, 1],
    ]);
    expect(groups[2].label).toBe('미상');
  });

  it('학생이 없으면 빈 배열이다', () => {
    expect(buildChurnStageGroups([])).toEqual([]);
  });
});

describe('listGradeOptions / computeSuccessRate', () => {
  it('학년은 중복 제거 후 정렬한다', () => {
    expect(listGradeOptions(POOL)).toEqual(['10', '11']);
  });

  it('성공률은 pending 제외 결과 중 reactivated 비율(반올림)이다', () => {
    const s = student({
      reactivation_log: [
        { outcome: 'reactivated' },
        { outcome: 'rejected' },
        { outcome: 'no_response' },
        { outcome: 'pending' },
      ],
    });
    expect(computeSuccessRate([s])).toBe(33);
  });

  it('결과가 없으면 null이다', () => {
    expect(computeSuccessRate([A])).toBeNull();
    expect(computeSuccessRate([student({ reactivation_log: [{ outcome: 'pending' }] })])).toBeNull();
  });
});

describe('churnedDaysAgo / lastConsultationSnippet', () => {
  it('updated_at 기준 경과일(내림)', () => {
    expect(churnedDaysAgo(student({ updated_at: ago(10) }))).toBe(10);
  });

  it('가장 최근 상담의 ai_purified 우선, 없으면 raw_memo, 60자 제한', () => {
    const s = student({
      consultation_timeline: [
        { created_at: '2026-01-01', ai_purified: 'old', raw_memo: null },
        { created_at: '2026-02-01', ai_purified: null, raw_memo: 'x'.repeat(100) },
      ],
    });
    expect(lastConsultationSnippet(s)).toBe('x'.repeat(60));
    expect(lastConsultationSnippet(student({}))).toBe('');
  });
});
