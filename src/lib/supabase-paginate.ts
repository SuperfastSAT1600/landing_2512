// Supabase는 요청당 max-rows=1000 하드 캡이 있어 .range()로도 한 번에 못 넘긴다.
// count로 배치 수를 구한 뒤 1,000행씩 병렬 range 조회하여 전체 행을 이어붙인다.

type CountResult = { count: number | null };
type RangeResult<T> = { data: T[] | null; error: unknown };

/**
 * 전체 행을 배치로 나눠 병렬 조회한 뒤 하나로 이어붙인다.
 *
 * @param countQuery  `{ count: 'exact', head: true }`로 만든 카운트 쿼리(then-able)
 * @param rangeQuery  (from, to) → `.range(from, to)`가 적용된 조회 쿼리를 만드는 팩토리
 * @param batchSize   배치 크기(기본 1000 = Supabase 하드 캡)
 * @returns 이어붙인 rows, 배치 중 하나라도 실패하면 error(그 경우 rows는 빈 배열)
 */
export async function fetchAllRows<T>(
  countQuery: PromiseLike<CountResult>,
  rangeQuery: (from: number, to: number) => PromiseLike<RangeResult<T>>,
  batchSize = 1000,
): Promise<{ rows: T[]; error: unknown | null }> {
  const { count } = await countQuery;
  const batches = Math.max(1, Math.ceil((count ?? 0) / batchSize));
  const results = await Promise.all(
    Array.from({ length: batches }, (_, i) =>
      rangeQuery(i * batchSize, (i + 1) * batchSize - 1),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return { rows: [], error: failed.error };
  return { rows: results.flatMap((r) => r.data ?? []), error: null };
}
