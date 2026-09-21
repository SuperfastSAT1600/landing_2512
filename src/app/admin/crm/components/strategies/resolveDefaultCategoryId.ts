/**
 * 새 전략을 생성할 때 넣을 기본 카테고리를 고른다. 카테고리는 순수 진열용이라
 * 어느 카테고리에 들어가든 기능(kind)에는 영향이 없으므로, 이름 매칭 없이
 * sort_order가 가장 낮은 카테고리를 쓴다 — 이름이 바뀌거나 특정 카테고리가
 * 삭제돼도 깨지지 않는다 (146 RetryKanban 이름 매칭 버그 수정).
 */
export function resolveDefaultCategoryId(
  categories: { id: string; sort_order: number }[]
): string | null {
  if (categories.length === 0) return null;
  return [...categories].sort((a, b) => a.sort_order - b.sort_order)[0].id;
}
