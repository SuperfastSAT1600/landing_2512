// PostgREST는 한 요청에 최대 1000행만 준다. 테이블 전체가 필요할 때 쓰는 스캔.
// 페이지를 하나씩 순서대로 받으면 DB 왕복이 페이지 수만큼 쌓인다(원격 리전이면 수 초).
// 첫 페이지에서 전체 개수(count)를 받고 나머지 페이지는 동시에 요청한다.

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
}

/** build의 세 번째 인자 — 첫 페이지에서만 COUNT를 요청한다(나머지 페이지까지 세면 같은 COUNT를 반복한다). */
export type ScanCount = { count: 'exact' } | undefined;

/**
 * 이 서버 인스턴스에서 동시에 날리는 페이지 요청 수 상한(모든 스캔 공용).
 * 여러 테이블을 병렬로 스캔해도 DB 연결을 한꺼번에 점유하지 않게 한다.
 */
const MAX_CONCURRENT_PAGES = 8;
let active = 0;
const waiting: Array<() => void> = [];

async function withSlot<R>(fn: () => PromiseLike<R>): Promise<R> {
  if (active >= MAX_CONCURRENT_PAGES) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

async function scanOnce<T>(
  build: (from: number, to: number, count: ScanCount) => PromiseLike<PageResult<T>>,
  pageSize: number
): Promise<{ rows: T[]; count: number }> {
  const first = await withSlot(() => build(0, pageSize - 1, { count: 'exact' }));
  if (first.error) throw new Error(first.error.message);
  if (first.count == null) throw new Error('scanAllPages: 첫 페이지 응답에 count가 없습니다.');

  // count 없이 요청한 페이지는 끝을 넘어도 416이 아니라 빈 배열로 온다(실측 2026-10-02).
  const offsets: number[] = [];
  for (let from = pageSize; from < first.count; from += pageSize) offsets.push(from);
  const pages = await Promise.all(
    offsets.map((from) => withSlot(() => build(from, from + pageSize - 1, undefined)))
  );
  const rows = [...(first.data ?? [])];
  for (const page of pages) {
    if (page.error) throw new Error(page.error.message);
    rows.push(...(page.data ?? []));
  }
  return { rows, count: first.count };
}

/**
 * build(from, to, count)는 `.order(...)`가 적용된 쿼리에 `select(cols, count)`를 붙여 돌려줘야 한다.
 * 정렬이 없으면 페이지 사이에 행이 겹치거나 빠질 수 있다.
 * 받은 행 수가 count와 다르면(스캔 중 행 추가·삭제) 한 번 다시 읽는다.
 * 다시 읽어도 행이 모자라면 일부 데이터로 계산하지 않도록 throw한다(남는 건 스캔 중 추가된 행이라 허용).
 */
export async function scanAllPages<T>(
  build: (from: number, to: number, count: ScanCount) => PromiseLike<PageResult<T>>,
  { pageSize = 1000 }: { pageSize?: number } = {}
): Promise<T[]> {
  const first = await scanOnce(build, pageSize);
  if (first.rows.length === first.count) return first.rows;
  const retry = await scanOnce(build, pageSize);
  if (retry.rows.length < retry.count) {
    throw new Error(`scanAllPages: 행이 모자랍니다(count=${retry.count}, rows=${retry.rows.length}).`);
  }
  return retry.rows;
}
