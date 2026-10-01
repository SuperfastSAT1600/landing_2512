export interface CategoryOrderRef {
  id: string;
  sort_order: number;
}

/**
 * 전략 통계가 집계할 카테고리를 정한다.
 *
 * `category_id` 가 없으면 세그먼트의 첫 카테고리(sort_order 최소)로 떨어진다.
 * 배포 직후 브라우저에 남아 있는 **옛 번들**이 이 파라미터 없이 요청하기 때문이다 —
 * 그때 400을 내면 열어둔 탭마다 빨간 에러가 뜬다. 화면이 새로고침되면 자기가 고른
 * 카테고리를 보내므로, 이 폴백은 그 사이를 메우는 용도다.
 *
 * 실재하지 않는 id 가 와도 그대로 쓴다. 빈 집계를 보여주는 게 정답이지,
 * 조용히 다른 카테고리 숫자를 보여주면 사용자가 잘못된 값을 믿게 된다.
 */
export function resolveCategoryId(
  requested: string | null | undefined,
  categories: CategoryOrderRef[]
): string | null {
  if (requested) return requested;
  if (!categories.length) return null;
  return [...categories].sort((a, b) => a.sort_order - b.sort_order)[0].id;
}
