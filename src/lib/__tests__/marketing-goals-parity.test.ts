// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 마케팅 목표 화면의 리드 집계가 Business 한국비즈니스와 갈라지지 않도록 지키는 테스트.
 *
 * 두 곳은 서로 다른 함수를 쓴다:
 *   - Business:  crm-stats-service.computeCrmStats({ segment: 'all' }) → overview.total_leads
 *   - 마케팅 목표: marketing-goals.fetchWeeklyGoalRows → actual_total
 * 리드 정의(students.inquiry_date 범위, company_id 필터 없음)가 같아야 숫자가 맞는다.
 * 같은 students 픽스처를 두 경로에 흘려 총계가 일치하는지 본다.
 */

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));

type Row = Record<string, unknown>;

const WEEK_START = '2026-08-31';
const WEEK_END = '2026-09-06';

/** 이 주차에 인입한 리드 — B2C/B2B(company_id), 소개, 미분류, 주차 밖 리드까지 섞는다. */
const STUDENTS: Row[] = [
  { id: 's1', name: 'a', traffic_source: '인스타그램 광고', inquiry_date: '2026-08-31', created_at: '2026-08-31T00:00:00Z', company_id: null, stage_history: null, funnel_stage: '1', lead_status: null, retry_strategy_id: null, first_message_sent_at: null, funnel_stage_updated_at: null },
  { id: 's2', name: 'b', traffic_source: '인스타그램 오가닉', inquiry_date: '2026-09-02T10:00:00+09:00', created_at: '2026-09-02T00:00:00Z', company_id: null, stage_history: null, funnel_stage: '1', lead_status: null, retry_strategy_id: null, first_message_sent_at: null, funnel_stage_updated_at: null },
  { id: 's3', name: 'c', traffic_source: '레딧', inquiry_date: '2026-09-06', created_at: '2026-09-06T00:00:00Z', company_id: null, stage_history: null, funnel_stage: '1', lead_status: null, retry_strategy_id: null, first_message_sent_at: null, funnel_stage_updated_at: null },
  // B2B 업체 리드 — 두 경로 모두 제외하지 않아야 한다
  { id: 's4', name: 'd', traffic_source: 'B2B 파트너', inquiry_date: '2026-09-03', created_at: '2026-09-03T00:00:00Z', company_id: 'c1', stage_history: null, funnel_stage: '1', lead_status: null, retry_strategy_id: null, first_message_sent_at: null, funnel_stage_updated_at: null },
  { id: 's5', name: 'e', traffic_source: '소개', inquiry_date: '2026-09-04', created_at: '2026-09-04T00:00:00Z', company_id: null, stage_history: null, funnel_stage: '1', lead_status: null, retry_strategy_id: null, first_message_sent_at: null, funnel_stage_updated_at: null },
  // 미분류 (매핑에 없는 소스)
  { id: 's6', name: 'f', traffic_source: '알 수 없는 소스', inquiry_date: '2026-09-05', created_at: '2026-09-05T00:00:00Z', company_id: null, stage_history: null, funnel_stage: '1', lead_status: null, retry_strategy_id: null, first_message_sent_at: null, funnel_stage_updated_at: null },
  // 주차 밖 — 양쪽 모두 세지 않아야 한다
  { id: 's7', name: 'g', traffic_source: '레딧', inquiry_date: '2026-08-30', created_at: '2026-08-30T00:00:00Z', company_id: null, stage_history: null, funnel_stage: '1', lead_status: null, retry_strategy_id: null, first_message_sent_at: null, funnel_stage_updated_at: null },
  { id: 's8', name: 'h', traffic_source: '레딧', inquiry_date: '2026-09-07', created_at: '2026-09-07T00:00:00Z', company_id: null, stage_history: null, funnel_stage: '1', lead_status: null, retry_strategy_id: null, first_message_sent_at: null, funnel_stage_updated_at: null },
];

/** 날짜 필터를 JS 에서 실제로 적용하는 스텁 — 두 경로가 서로 다른 연산자를 쓴다(lte vs lt). */
function filterBuilder(rows: Row[], field: string) {
  const b: { gte?: string; lte?: string; lt?: string } = {};
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'is', 'not', 'order', 'limit']) builder[m] = vi.fn(() => builder);
  builder.gte = vi.fn((f: string, v: string) => { if (f === field) b.gte = v; return builder; });
  builder.lte = vi.fn((f: string, v: string) => { if (f === field) b.lte = v; return builder; });
  builder.lt = vi.fn((f: string, v: string) => { if (f === field) b.lt = v; return builder; });
  builder.then = (resolve: (v: { data: Row[]; error: null }) => unknown) => {
    const data = rows.filter((r) => {
      const v = String(r[field] ?? '').slice(0, 10);
      if (b.gte && v < b.gte.slice(0, 10)) return false;
      if (b.lte && v > b.lte.slice(0, 10)) return false;
      if (b.lt && v >= b.lt.slice(0, 10)) return false;
      return true;
    });
    return Promise.resolve({ data, error: null }).then(resolve);
  };
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockImplementation((table: string) => {
    if (table === 'students') return filterBuilder(STUDENTS, 'inquiry_date');
    if (table === 'payments') return filterBuilder([], 'paid_at');
    if (table === 'marketing_weekly_goals') return filterBuilder([], 'week_start');
    if (table === 'companies') return filterBuilder([], 'id');
    return filterBuilder([], 'id');
  });
});

describe('마케팅 목표 집계 = Business 한국비즈니스 집계', () => {
  it('같은 주차 총 리드 수가 일치한다', async () => {
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    const { computeCrmStats } = await import('../crm-stats-service');

    const [marketing] = await fetchWeeklyGoalRows([WEEK_START]);
    const business = await computeCrmStats({ from: WEEK_START, to: WEEK_END, segment: 'all' });

    expect(business.ok).toBe(true);
    if (!business.ok) return;
    expect(marketing.actual_total).toBe(business.data.overview.total_leads);
    expect(marketing.actual_total).toBe(6); // 주차 밖 2건 제외
  });

  it('소스 그룹 합이 Business 소스별 합과 일치한다', async () => {
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    const { computeCrmStats } = await import('../crm-stats-service');
    const { getMarketingGroup } = await import('@/lib/marketing-groups');

    const [marketing] = await fetchWeeklyGoalRows([WEEK_START]);
    const business = await computeCrmStats({ from: WEEK_START, to: WEEK_END, segment: 'all' });
    if (!business.ok) throw new Error('stats failed');

    // Business 의 원본 소스별 리드를 마케팅 그룹으로 묶어 비교한다
    const grouped: Record<string, number> = {};
    for (const s of business.data.by_source) {
      const g = getMarketingGroup(s.source === '미입력' ? null : s.source);
      grouped[g] = (grouped[g] ?? 0) + s.leads;
    }

    for (const [group, count] of Object.entries(grouped)) {
      expect(marketing.actuals[group as keyof typeof marketing.actuals]).toBe(count);
    }
  });

  it('B2B 업체 리드를 양쪽 모두 제외하지 않는다', async () => {
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    const [marketing] = await fetchWeeklyGoalRows([WEEK_START]);
    expect(marketing.actuals['B2B']).toBe(1);
  });

  it('소개·미분류도 양쪽 총계에 포함된다', async () => {
    const { fetchWeeklyGoalRows } = await import('../marketing-goals');
    const [marketing] = await fetchWeeklyGoalRows([WEEK_START]);
    expect(marketing.actuals['소개']).toBe(1);
    expect(marketing.actuals['미분류']).toBe(1);
  });
});
