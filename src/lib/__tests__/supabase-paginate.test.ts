import { describe, it, expect, vi } from 'vitest';
import { fetchAllRows } from '@/lib/supabase-paginate';

describe('fetchAllRows', () => {
  it('count가 0이어도 최소 1배치를 조회한다', async () => {
    const range = vi.fn(async () => ({ data: [], error: null }));
    const { rows, error } = await fetchAllRows(
      Promise.resolve({ count: 0 }),
      range,
    );
    expect(error).toBeNull();
    expect(rows).toEqual([]);
    expect(range).toHaveBeenCalledTimes(1);
    expect(range).toHaveBeenCalledWith(0, 999);
  });

  it('count > batchSize면 배치 수만큼 range를 나눠 호출하고 결과를 이어붙인다', async () => {
    const pages: Record<number, { id: number }[]> = {
      0: [{ id: 1 }, { id: 2 }],
      1000: [{ id: 3 }],
      2000: [{ id: 4 }],
    };
    const range = vi.fn(async (from: number) => ({ data: pages[from] ?? [], error: null }));
    const { rows, error } = await fetchAllRows(
      Promise.resolve({ count: 2500 }),
      range,
    );
    expect(error).toBeNull();
    expect(range).toHaveBeenCalledTimes(3);
    expect(range.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    expect(rows).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
  });

  it('배치 중 하나라도 error면 error를 반환하고 rows는 비운다', async () => {
    const boom = new Error('DB error');
    const range = vi.fn(async (from: number) =>
      from === 1000 ? { data: null, error: boom } : { data: [{ id: from }], error: null },
    );
    const { rows, error } = await fetchAllRows(
      Promise.resolve({ count: 3000 }),
      range,
    );
    expect(error).toBe(boom);
    expect(rows).toEqual([]);
  });

  it('batchSize 인자를 존중한다', async () => {
    const range = vi.fn(async () => ({ data: [], error: null }));
    await fetchAllRows(Promise.resolve({ count: 5 }), range, 2);
    expect(range).toHaveBeenCalledTimes(3);
    expect(range.mock.calls).toEqual([[0, 1], [2, 3], [4, 5]]);
  });

  it('data가 null인 배치는 빈 배열로 취급한다', async () => {
    const range = vi.fn(async () => ({ data: null, error: null }));
    const { rows, error } = await fetchAllRows(Promise.resolve({ count: 10 }), range);
    expect(error).toBeNull();
    expect(rows).toEqual([]);
  });
});
