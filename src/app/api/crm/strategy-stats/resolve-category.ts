import { supabaseAdmin } from '@/lib/supabase-admin';
import { resolveCategoryId } from '@/lib/strategy-category-scope';

/**
 * 요청의 category_id 를 확정한다. 없으면 세그먼트 첫 카테고리로 떨어진다.
 * 통계와 드릴다운이 같은 규칙을 써야 카드 숫자와 명단이 어긋나지 않으므로 한 곳에 둔다.
 */
export async function resolveRequestCategoryId(
  requested: string | null,
  segment: string | null
): Promise<string | null> {
  if (requested) return requested;

  const { data, error } = await supabaseAdmin
    .from('strategy_categories')
    .select('id, sort_order')
    .eq('segment', segment === 'b2b' ? 'b2b' : 'b2c');

  if (error) {
    console.error('[strategy-stats resolve-category]', error);
    return null;
  }
  return resolveCategoryId(null, data ?? []);
}
