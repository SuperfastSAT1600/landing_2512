import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let lastBuilder: Record<string, ReturnType<typeof vi.fn>>;

function makeBuilder(result: { data: unknown; error: null | { message: string } }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq', 'in', 'gte', 'insert', 'update', 'delete']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => builder);
  builder.then = (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  lastBuilder = builder as Record<string, ReturnType<typeof vi.fn>>;
  return builder;
}

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

function makeReq(weeks?: string, key = 'admin-key') {
  const qs = weeks ? `?weeks=${weeks}` : '';
  return new NextRequest(`http://localhost/api/crm/renewal-targets/stats${qs}`, {
    headers: { 'x-admin-key': key },
  });
}

function row(weekStart: string, stage: string, outcomeQuality: 'good' | 'bad' | null = null) {
  return {
    id: `rt-${weekStart}-${stage}`,
    student_id: 's-1',
    week_start: weekStart,
    stage,
    stage_updated_at: `${weekStart}T00:00:00Z`,
    converted_payment_id: stage === '4' ? 'pay-1' : null,
    outcome_quality: outcomeQuality,
    created_by: null,
    created_at: `${weekStart}T00:00:00Z`,
    updated_at: `${weekStart}T00:00:00Z`,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/crm/renewal-targets/stats', () => {
  it('rejects a wrong admin key → 401', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeReq(undefined, 'nope'));
    expect(res.status).toBe(401);
  });

  it('returns weekly selected/open/completed/dropped/conversion_rate sorted by newest week → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: [
          row('2026-08-10', '1'),
          row('2026-08-10', '4'),
          row('2026-08-03', '1'),
          row('2026-08-03', '2'),
          row('2026-07-27', '4'),
        ],
        error: null,
      })
    );
    const { GET } = await import('../route');
    const res = await GET(makeReq('8'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(3);

    const first = json.data[0];
    expect(first.week_start).toBe('2026-08-10');
    expect(first.selected).toBe(2);
    expect(first.open).toBe(1);
    expect(first.completed).toBe(1);
    expect(first.dropped).toBe(0);
    expect(first.conversion_rate).toBe(50);

    const second = json.data[1];
    expect(second.week_start).toBe('2026-08-03');
    expect(second.selected).toBe(2);
    expect(second.open).toBe(2);
    expect(second.completed).toBe(0);
    expect(second.conversion_rate).toBe(0);

    const third = json.data[2];
    expect(third.week_start).toBe('2026-07-27');
    expect(third.selected).toBe(1);
    expect(third.open).toBe(0);
    expect(third.completed).toBe(1);
    expect(third.conversion_rate).toBe(100);
  });

  it('counts 미전환(5) as dropped, not open, and keeps it in the denominator → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: [
          row('2026-08-10', '4'),
          row('2026-08-10', '5'),
          row('2026-08-10', '5'),
          row('2026-08-10', '2'),
        ],
        error: null,
      })
    );
    const { GET } = await import('../route');
    const res = await GET(makeReq('8'));
    const json = await res.json();
    const week = json.data[0];
    expect(week.selected).toBe(4);
    expect(week.open).toBe(1);
    expect(week.completed).toBe(1);
    expect(week.dropped).toBe(2);
    expect(week.conversion_rate).toBe(25);
  });

  it('bounds the query by week_start instead of scanning the whole table → 200', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [], error: null }));
    const { GET } = await import('../route');
    await GET(makeReq('4'));
    expect(lastBuilder.gte).toHaveBeenCalledWith('week_start', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('limits result count by weeks param → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: [row('2026-08-10', '1'), row('2026-08-03', '1'), row('2026-07-27', '1')],
        error: null,
      })
    );
    const { GET } = await import('../route');
    const res = await GET(makeReq('2'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
  });

  it('returns empty array when no targets exist → 200', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [], error: null }));
    const { GET } = await import('../route');
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([]);
  });

  it('handles empty weeks param as default 8 → 200', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [], error: null }));
    const { GET } = await import('../route');
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });
});

describe('GET /api/crm/renewal-targets/stats — 결과 품질 분포 (REQ-004)', () => {
  it('counts good/bad separately for 결제 완료 and 미전환 → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: [
          row('2026-08-17', '4', 'good'),
          row('2026-08-17', '4', 'good'),
          row('2026-08-17', '4', 'bad'),
          row('2026-08-17', '5', 'good'),
          row('2026-08-17', '5', 'bad'),
          row('2026-08-17', '5', 'bad'),
        ],
        error: null,
      })
    );
    const { GET } = await import('../route');
    const res = await GET(makeReq());
    const json = await res.json();
    const week = json.data.find((r: { week_start: string }) => r.week_start === '2026-08-17');
    expect(week.good_completed).toBe(2);
    expect(week.bad_completed).toBe(1);
    expect(week.good_dropped).toBe(1);
    expect(week.bad_dropped).toBe(2);
  });

  it('leaves 미분류(null) out of every bucket while keeping completed/dropped totals whole', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: [
          row('2026-08-17', '4', 'good'),
          row('2026-08-17', '4', null),
          row('2026-08-17', '4', null),
          row('2026-08-17', '5', null),
        ],
        error: null,
      })
    );
    const { GET } = await import('../route');
    const res = await GET(makeReq());
    const json = await res.json();
    const week = json.data[0];
    expect(week.completed).toBe(3);
    expect(week.dropped).toBe(1);
    // 미분류는 별도 필드 없이 총계 - 좋음 - 나쁨 으로 구한다.
    expect(week.good_completed).toBe(1);
    expect(week.bad_completed).toBe(0);
    expect(week.completed - week.good_completed - week.bad_completed).toBe(2);
    expect(week.good_dropped).toBe(0);
    expect(week.bad_dropped).toBe(0);
  });

  it('reads outcome_quality in the same narrowed select', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [], error: null }));
    const { GET } = await import('../route');
    await GET(makeReq());
    expect(lastBuilder.select.mock.calls[0][0]).toContain('outcome_quality');
  });
});
