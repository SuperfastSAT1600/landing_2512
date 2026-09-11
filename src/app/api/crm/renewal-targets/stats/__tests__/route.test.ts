import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let lastBuilder: Record<string, ReturnType<typeof vi.fn>>;

function makeBuilder(result: { data: unknown; error: null | { message: string } }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq', 'in', 'gte', 'lte', 'insert', 'update', 'delete']) {
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

function row(
  weekStart: string,
  stage: string,
  outcomeQuality: 'good' | 'bad' | null = null,
  carry: { to?: string | null; from?: string | null } = {}
) {
  return {
    id: `rt-${weekStart}-${stage}`,
    student_id: 's-1',
    week_start: weekStart,
    stage,
    stage_updated_at: `${weekStart}T00:00:00Z`,
    converted_payment_id: stage === '4' ? 'pay-1' : null,
    outcome_quality: outcomeQuality,
    carried_to_week: carry.to ?? null,
    carried_from_week: carry.from ?? null,
    created_by: null,
    created_at: `${weekStart}T00:00:00Z`,
    updated_at: `${weekStart}T00:00:00Z`,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // 결제 금액 조회(payments)가 뒤따를 수 있다 — 지정하지 않은 테스트는 빈 결제로 본다.
  mockFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
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

describe('GET /api/crm/renewal-targets/stats — 주차 이월', () => {
  it('이월된 행은 진행 중에서 빠지고 선정·전환율은 보존된다', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: [
          row('2026-08-24', '4', 'good'),
          row('2026-08-24', '2', null, { to: '2026-08-31' }),
          row('2026-08-24', '2', null, { to: '2026-08-31' }),
        ],
        error: null,
      })
    );
    const { GET } = await import('../route');
    const res = await GET(makeReq());
    const json = await res.json();
    const week = json.data[0];

    expect(week.selected).toBe(3);
    expect(week.carried_out).toBe(2);
    expect(week.open).toBe(0); // 진행 중 0 → 그 주차가 마감된다
    expect(week.conversion_rate).toBeCloseTo(33.33, 1); // 분모는 선정 3 그대로
  });

  it('carried_in 은 별개 축 — 선정을 신규/이월유입으로 분해한다', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: [
          row('2026-08-31', '2', null, { from: '2026-08-24' }),
          row('2026-08-31', '2', null, { from: '2026-08-24' }),
          row('2026-08-31', '1'),
        ],
        error: null,
      })
    );
    const { GET } = await import('../route');
    const res = await GET(makeReq());
    const week = (await res.json()).data[0];

    expect(week.selected).toBe(3);
    expect(week.carried_in).toBe(2); // 신규 1 · 이월 2
    expect(week.carried_out).toBe(0);
    expect(week.open).toBe(3); // 유입은 진행 중에서 빠지지 않는다
  });

  it('이월 컬럼을 같은 좁힌 select 로 읽는다', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [], error: null }));
    const { GET } = await import('../route');
    await GET(makeReq());
    expect(lastBuilder.select.mock.calls[0][0]).toContain('carried_to_week');
    expect(lastBuilder.select.mock.calls[0][0]).toContain('carried_from_week');
  });
});

describe('GET /api/crm/renewal-targets/stats — 주차별 재결제 금액', () => {
  /** 결제가 연결된 4단계 행. */
  function paid(weekStart: string, paymentId: string | null) {
    return { ...row(weekStart, '4'), converted_payment_id: paymentId };
  }

  it('그 주차 결제 완료 건의 payments.amount 를 합산한다 (REQ-001)', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeBuilder({
          data: [
            paid('2026-09-07', 'pay-1'),
            paid('2026-09-07', 'pay-2'),
            paid('2026-08-31', 'pay-3'),
            row('2026-08-31', '5'),
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(
        makeBuilder({
          data: [
            { id: 'pay-1', amount: 1_200_000 },
            { id: 'pay-2', amount: 800_000 },
            { id: 'pay-3', amount: 450_000 },
          ],
          error: null,
        })
      );
    const { GET } = await import('../route');
    const res = await GET(makeReq());
    const json = await res.json();

    expect(json.data[0].week_start).toBe('2026-09-07');
    expect(json.data[0].completed_amount).toBe(2_000_000);
    expect(json.data[1].completed_amount).toBe(450_000);
  });

  it('결제가 연결되지 않은 결제 완료 건은 amount_missing 으로 드러낸다 (REQ-002)', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeBuilder({
          data: [paid('2026-09-07', 'pay-1'), paid('2026-09-07', null), paid('2026-09-07', null)],
          error: null,
        })
      )
      .mockReturnValueOnce(
        makeBuilder({ data: [{ id: 'pay-1', amount: 1_000_000 }], error: null })
      );
    const { GET } = await import('../route');
    const json = await (await GET(makeReq())).json();

    expect(json.data[0].completed).toBe(3);
    expect(json.data[0].completed_amount).toBe(1_000_000);
    expect(json.data[0].amount_missing).toBe(2);
  });

  it('결제 완료가 없으면 금액 0 이지만 보드 외 재결제는 계속 본다', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeBuilder({ data: [row('2026-09-07', '2'), row('2026-09-07', '5')], error: null })
      )
      // 링크가 없으니 id 조회는 건너뛰고 재결제 조회만 뒤따른다.
      .mockReturnValueOnce(
        makeBuilder({
          data: [
            {
              id: 'pay-9',
              student_id: 'ruby',
              amount: 4_450_000,
              paid_at: '2026-09-10T12:00:00+09:00',
            },
          ],
          error: null,
        })
      );
    const { GET } = await import('../route');
    const json = await (await GET(makeReq())).json();

    expect(json.data[0].completed_amount).toBe(0);
    expect(json.data[0].amount_missing).toBe(0);
    expect(json.data[0].off_board_amount).toBe(4_450_000);
  });

  it('대상이 하나도 없으면 결제를 조회하지 않는다', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [], error: null }));
    const { GET } = await import('../route');
    await GET(makeReq());

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).not.toHaveBeenCalledWith('payments');
  });

  it('링크가 없어도 그 주차에 찍힌 같은 학생의 재결제로 금액을 되짚는다 (REQ-003)', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeBuilder({
          data: [
            { ...paid('2026-08-24', 'pay-1'), student_id: 's-1' },
            { ...paid('2026-08-24', null), student_id: 'grace' },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(makeBuilder({ data: [{ id: 'pay-1', amount: 4_990_000 }], error: null }))
      .mockReturnValueOnce(
        makeBuilder({
          data: [
            {
              id: 'pay-9',
              student_id: 'grace',
              amount: 1_650_000,
              paid_at: '2026-08-24T03:00:00+09:00',
            },
          ],
          error: null,
        })
      );
    const { GET } = await import('../route');
    const json = await (await GET(makeReq())).json();

    expect(json.data[0].completed_amount).toBe(6_640_000);
    expect(json.data[0].amount_missing).toBe(0);
  });

  it('되짚기는 재결제 결제만, 조회 주차 안에서만 본다', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeBuilder({
          data: [{ ...paid('2026-08-24', null), student_id: 'grace' }],
          error: null,
        })
      )
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }));
    const { GET } = await import('../route');
    await GET(makeReq());

    expect(mockFrom).toHaveBeenCalledWith('payments');
    expect(lastBuilder.eq).toHaveBeenCalledWith('payment_type', '재결제');
    expect(lastBuilder.gte).toHaveBeenCalledWith('paid_at', expect.stringContaining('+09:00'));
    expect(lastBuilder.lte).toHaveBeenCalledWith('paid_at', expect.stringContaining('+09:00'));
  });

  it('링크로 이미 잡힌 결제는 보드 외로 중복 계산하지 않는다', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeBuilder({ data: [{ ...paid('2026-08-24', 'pay-1'), student_id: 's-1' }], error: null })
      )
      .mockReturnValueOnce(makeBuilder({ data: [{ id: 'pay-1', amount: 1_000_000 }], error: null }))
      .mockReturnValueOnce(
        makeBuilder({
          data: [
            {
              id: 'pay-1',
              student_id: 's-1',
              amount: 1_000_000,
              paid_at: '2026-08-26T12:00:00+09:00',
            },
          ],
          error: null,
        })
      );
    const { GET } = await import('../route');
    const json = await (await GET(makeReq())).json();

    expect(json.data[0].completed_amount).toBe(1_000_000);
    expect(json.data[0].off_board_amount).toBe(0);
  });

  it('결제 조회가 실패해도 인원 통계는 내려주고 금액만 0 으로 둔다', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [paid('2026-09-07', 'pay-1')], error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { GET } = await import('../route');
    const res = await GET(makeReq());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data[0].completed).toBe(1);
    expect(json.data[0].completed_amount).toBe(0);
    // 금액에 잡히지 않은 건은 숨기지 않는다.
    expect(json.data[0].amount_missing).toBe(1);
  });
});
