import { describe, it, expect, vi, beforeEach } from 'vitest';

// 이 파일의 핵심은 "부분 실패해도 재실행으로 자동 복구된다"는 것이다.
// 트랜잭션이 없으므로 INSERT→UPDATE 순서와 멱등성이 유일한 안전장치다.

type Result = { data: unknown; error: null | { message: string; code?: string } };

let calls: { table: string; op: string; args: unknown[] }[] = [];
let queue: Result[] = [];

function makeBuilder(table: string, result: Result) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'in', 'lt', 'is', 'eq', 'upsert', 'update', 'insert']) {
    builder[m] = vi.fn((...args: unknown[]) => {
      calls.push({ table, op: m, args });
      return builder;
    });
  }
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));

/** 스캔 → upsert → update 순으로 응답을 큐잉한다. */
function respond(...results: Result[]) {
  queue = [...results];
  mockFrom.mockImplementation((table: string) => makeBuilder(table, queue.shift()!));
}

function argsOf(op: string): unknown[] | undefined {
  return calls.find((c) => c.op === op)?.args;
}

/** 2026-08-24 주차(26년 08월 04주차)에 열려 있는 대상. */
function source(over: Record<string, unknown> = {}) {
  return {
    id: 'rt-old',
    student_id: 's-1',
    week_start: '2026-08-24',
    stage: '2',
    stage_updated_at: '2026-08-20T00:00:00Z',
    ...over,
  };
}

// 26년 09월 01주차 = 2026-08-31 ~ 2026-09-06. KST 정오로 고정한다.
const NOW = new Date('2026-08-31T03:00:00Z');

beforeEach(() => {
  calls = [];
  vi.clearAllMocks();
});

describe('carryOverRenewalTargets', () => {
  it('현재 주차보다 앞선 열린 행만, 아직 이월되지 않은 것만 스캔한다', async () => {
    respond({ data: [], error: null });
    const { carryOverRenewalTargets } = await import('../renewal-carry-over');
    const res = await carryOverRenewalTargets(NOW);

    expect(res).toEqual({ ok: true, data: { week_start: '2026-08-31', created: 0, closed: 0 } });
    expect(argsOf('in')).toEqual(['stage', ['1', '2', '3']]);
    expect(argsOf('lt')).toEqual(['week_start', '2026-08-31']);
    expect(argsOf('is')).toEqual(['carried_to_week', null]);
  });

  it('새 행에 stage_updated_at 을 승계한다 — 리셋하면 정체 경고가 영원히 안 뜬다', async () => {
    respond(
      { data: [source()], error: null },
      { data: [{ id: 'rt-new' }], error: null },
      { data: [{ id: 'rt-old' }], error: null }
    );
    const { carryOverRenewalTargets } = await import('../renewal-carry-over');
    const res = await carryOverRenewalTargets(NOW);

    const [rows] = argsOf('upsert') as [Record<string, unknown>[]];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      student_id: 's-1',
      week_start: '2026-08-31',
      stage: '2',
      stage_updated_at: '2026-08-20T00:00:00Z', // ← now() 가 아니다
      carried_from_week: '2026-08-24',
      created_by: 'carry-over',
    });
    expect(res).toEqual({ ok: true, data: { week_start: '2026-08-31', created: 1, closed: 1 } });
  });

  it('충돌은 무시하고 통과시킨다 — 배열 insert 는 한 행만 겹쳐도 배치 전체가 죽는다', async () => {
    respond(
      { data: [source()], error: null },
      { data: [{ id: 'rt-new' }], error: null },
      { data: [{ id: 'rt-old' }], error: null }
    );
    const { carryOverRenewalTargets } = await import('../renewal-carry-over');
    await carryOverRenewalTargets(NOW);

    const [, options] = argsOf('upsert') as [unknown, Record<string, unknown>];
    expect(options).toEqual({ onConflict: 'student_id,week_start', ignoreDuplicates: true });
  });

  it('원 행을 닫을 때 carried_to_week 이 비어 있는 것만 건드린다 (재실행 안전)', async () => {
    respond(
      { data: [source()], error: null },
      { data: [{ id: 'rt-new' }], error: null },
      { data: [{ id: 'rt-old' }], error: null }
    );
    const { carryOverRenewalTargets } = await import('../renewal-carry-over');
    await carryOverRenewalTargets(NOW);

    const [payload] = argsOf('update') as [Record<string, unknown>];
    expect(payload.carried_to_week).toBe('2026-08-31');
    // stage_updated_at 은 원 행에서도 건드리면 안 된다 (D+N·목록 정렬 기준).
    expect(payload).not.toHaveProperty('stage_updated_at');
    expect(calls.filter((c) => c.op === 'is').at(-1)?.args).toEqual(['carried_to_week', null]);
  });

  it('두 번째 실행은 아무것도 만들지 않는다 (멱등)', async () => {
    respond({ data: [], error: null });
    const { carryOverRenewalTargets } = await import('../renewal-carry-over');
    const res = await carryOverRenewalTargets(NOW);

    expect(res).toEqual({ ok: true, data: { week_start: '2026-08-31', created: 0, closed: 0 } });
    expect(calls.some((c) => c.op === 'upsert')).toBe(false);
    expect(calls.some((c) => c.op === 'update')).toBe(false);
  });

  it('INSERT 가 실패하면 원 행을 닫지 않는다 — 재실행하면 그대로 다시 스캔된다', async () => {
    respond(
      { data: [source()], error: null },
      { data: null, error: { message: 'boom' } }
    );
    const { carryOverRenewalTargets } = await import('../renewal-carry-over');
    const res = await carryOverRenewalTargets(NOW);

    expect(res).toEqual({ ok: false, code: 'INSERT_FAILED', message: '이월 대상 생성에 실패했습니다.' });
    expect(calls.some((c) => c.op === 'update')).toBe(false);
  });

  it('UPDATE 만 실패하면 실패를 알린다 — 새 행은 이미 있으므로 재실행 시 UPDATE 만 재수행된다', async () => {
    respond(
      { data: [source()], error: null },
      { data: [{ id: 'rt-new' }], error: null },
      { data: null, error: { message: 'boom' } }
    );
    const { carryOverRenewalTargets } = await import('../renewal-carry-over');
    const res = await carryOverRenewalTargets(NOW);

    expect(res).toEqual({ ok: false, code: 'UPDATE_FAILED', message: '이월 표시에 실패했습니다.' });
  });

  it('한 학생이 두 주차에 열려 있으면 최신 주차 stage 를 승계하고 원 행은 둘 다 닫는다', async () => {
    // 되돌리기(5→2) PATCH 에 주차 가드가 없어 실제로 생길 수 있는 상태.
    respond(
      {
        data: [
          source({ id: 'rt-older', week_start: '2026-08-17', stage: '1' }),
          source({ id: 'rt-newer', week_start: '2026-08-24', stage: '3' }),
        ],
        error: null,
      },
      { data: [{ id: 'rt-new' }], error: null },
      { data: [{ id: 'rt-older' }, { id: 'rt-newer' }], error: null }
    );
    const { carryOverRenewalTargets } = await import('../renewal-carry-over');
    const res = await carryOverRenewalTargets(NOW);

    const [rows] = argsOf('upsert') as [Record<string, unknown>[]];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ stage: '3', carried_from_week: '2026-08-24' });
    // 각 주차가 각자 '이월 1' 을 갖는 게 의미상 정직하다.
    expect(calls.find((c) => c.op === 'in' && c.args[0] === 'id')?.args[1]).toEqual([
      'rt-older',
      'rt-newer',
    ]);
    expect(res.ok && res.data.closed).toBe(2);
  });

  it('주차 정의 범위 밖이면 아무것도 하지 않는다', async () => {
    const { carryOverRenewalTargets } = await import('../renewal-carry-over');
    const res = await carryOverRenewalTargets(new Date('2030-01-01T00:00:00Z'));

    expect(res).toEqual({ ok: true, data: { week_start: null, created: 0, closed: 0 } });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('스캔이 실패하면 아무것도 쓰지 않는다', async () => {
    respond({ data: null, error: { message: 'boom' } });
    const { carryOverRenewalTargets } = await import('../renewal-carry-over');
    const res = await carryOverRenewalTargets(NOW);

    expect(res).toEqual({ ok: false, code: 'FETCH_FAILED', message: '이월 대상 조회에 실패했습니다.' });
    expect(calls.some((c) => c.op === 'upsert')).toBe(false);
  });
});
