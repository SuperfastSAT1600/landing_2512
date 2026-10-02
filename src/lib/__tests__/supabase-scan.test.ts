import { describe, it, expect, vi } from 'vitest';
import { scanAllPages, type ScanCount } from '../supabase-scan';

type Page = { data: number[] | null; error: { message: string } | null; count: number | null };

/** 0..total-1 행을 가진 가짜 테이블. 호출된 range·count 요청 여부·동시 요청 수를 기록한다. */
function fakeTable(totalOf: () => number, opts: { failAt?: number } = {}) {
  const calls: Array<{ from: number; to: number; counted: boolean }> = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const build = (from: number, to: number, count: ScanCount) => {
    calls.push({ from, to, counted: count?.count === 'exact' });
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    return new Promise<Page>((resolve) =>
      setTimeout(() => {
        inFlight--;
        const total = totalOf();
        if (opts.failAt === from) {
          resolve({ data: null, error: { message: 'boom' }, count: null });
          return;
        }
        const rows = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => from + i);
        resolve({ data: rows, error: null, count: count ? total : null });
      }, 5)
    );
  };
  return { build, calls, maxInFlight: () => maxInFlight, inFlight: () => inFlight };
}

describe('scanAllPages', () => {
  // REQ-001 (tutoring-users-perf)
  it('첫 페이지에서만 count를 받고 나머지 페이지는 동시에 요청해 순서대로 이어 붙인다', async () => {
    const t = fakeTable(() => 2500);
    const rows = await scanAllPages(t.build, { pageSize: 1000 });
    expect(rows).toEqual(Array.from({ length: 2500 }, (_, i) => i));
    expect(t.calls.map((c) => [c.from, c.to, c.counted])).toEqual([
      [0, 999, true], [1000, 1999, false], [2000, 2999, false],
    ]);
    expect(t.maxInFlight()).toBe(2);
  });

  it('동시 요청은 8개까지만 보내고, 묶음이 나뉘어도 순서대로 이어 붙인다', async () => {
    const t = fakeTable(() => 20_000);
    const rows = await scanAllPages(t.build, { pageSize: 1000 });
    expect(rows).toEqual(Array.from({ length: 20_000 }, (_, i) => i));
    expect(t.maxInFlight()).toBe(8);
  });

  it('동시 상한은 여러 스캔이 함께 쓴다', async () => {
    const a = fakeTable(() => 10_000);
    const b = fakeTable(() => 10_000);
    let peak = 0;
    const timer = setInterval(() => { peak = Math.max(peak, a.inFlight() + b.inFlight()); }, 1);
    await Promise.all([scanAllPages(a.build), scanAllPages(b.build)]);
    clearInterval(timer);
    expect(peak).toBeLessThanOrEqual(8);
  });

  it('한 페이지면 추가 요청이 없고, 빈 테이블은 빈 배열', async () => {
    const one = fakeTable(() => 418);
    expect(await scanAllPages(one.build)).toHaveLength(418);
    expect(one.calls).toHaveLength(1);
    expect(await scanAllPages(fakeTable(() => 0).build)).toEqual([]);
  });

  // REQ-003: 일부 페이지만 받은 채로 계산하지 않는다
  it('어느 페이지든 에러면 throw한다', async () => {
    const t = fakeTable(() => 2500, { failAt: 1000 });
    await expect(scanAllPages(t.build, { pageSize: 1000 })).rejects.toThrow('boom');
  });

  it('스캔 중 행이 지워져 행 수가 어긋나면 한 번 다시 읽고, 다시 맞으면 그 결과를 쓴다', async () => {
    // 첫 요청(count=2500) 직후 600행이 지워진다. t.calls는 build가 호출될 때마다 늘어난다(클로저는 호출 시점에 평가).
    const t = fakeTable(() => (t.calls.length <= 1 ? 2500 : 1900));
    const rows = await scanAllPages(t.build, { pageSize: 1000 });
    expect(rows).toEqual(Array.from({ length: 1900 }, (_, i) => i));
    expect(t.calls.filter((c) => c.counted)).toHaveLength(2);
  });

  it('다시 읽어도 행이 모자라면 일부 데이터로 계산하지 않도록 throw한다', async () => {
    // count는 늘 2500인데 페이지는 1900행까지만 준다(서버 행 상한이 더 작거나 계속 지워지는 상황)
    const short = (from: number, to: number, count: ScanCount) =>
      Promise.resolve({
        data: Array.from({ length: Math.max(0, Math.min(to, 1899) - from + 1) }, (_, i) => from + i),
        error: null,
        count: count ? 2500 : null,
      });
    await expect(scanAllPages(short, { pageSize: 1000 })).rejects.toThrow(/모자랍니다/);
  });

  it('스캔 중 행이 추가돼 더 많이 받은 건 허용한다', async () => {
    const more = (from: number, to: number, count: ScanCount) =>
      Promise.resolve({
        data: Array.from({ length: from === 0 ? 1000 : Math.max(0, Math.min(to, 1600) - from + 1) }, (_, i) => from + i),
        error: null,
        count: count ? 1500 : null,
      });
    expect(await scanAllPages(more, { pageSize: 1000 })).toHaveLength(1601);
  });

  it('첫 페이지에 count가 없으면 바로 알린다', async () => {
    const build = vi.fn(async () => ({ data: [1], error: null, count: null }));
    await expect(scanAllPages(build)).rejects.toThrow(/count/);
  });
});
