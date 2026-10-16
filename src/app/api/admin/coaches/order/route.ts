import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';
import { compareCoachOrder } from '@/lib/coach-roster';

// PATCH /api/admin/coaches/order { slugs } — 코치 표시 순서(coaches.sort_order = 목록 위치). 코치 현황 탭에서 쓴다.
export async function PATCH(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorized();
  const body = (await req.json().catch(() => null)) as { slugs?: unknown } | null;
  const slugs = Array.isArray(body?.slugs) && body.slugs.every((s) => typeof s === 'string') ? (body.slugs as string[]) : null;
  if (!slugs?.length || new Set(slugs).size !== slugs.length) return apiError('BAD_REQUEST', '코치 순서를 확인해 주세요.', 400);

  // 화면에 없는 코치(비활동·학생 없음)도 뒤에 이어 붙여 전체를 0..n-1로 다시 매긴다 — 예전 값과 겹치지 않게
  const { data, error } = await supabaseAdmin.from('coaches').select('*');
  if (error) return apiError('INTERNAL_ERROR', error.message, 500);
  const all = (data ?? []) as { slug: string; sort_order?: number | null; created_at: string }[];
  const known = new Set(all.map((c) => c.slug));
  if (!slugs.every((s) => known.has(s))) return apiError('BAD_REQUEST', '없는 코치가 포함되어 있습니다.', 400);
  const given = new Set(slugs);
  const rest = all.filter((c) => !given.has(c.slug))
    .sort((a, b) => compareCoachOrder({ sort_order: a.sort_order ?? null, created_at: a.created_at }, { sort_order: b.sort_order ?? null, created_at: b.created_at }))
    .map((c) => c.slug);

  const results = await Promise.all([...slugs, ...rest].map((slug, i) => supabaseAdmin.from('coaches').update({ sort_order: i }).eq('slug', slug)));
  const failed = results.find((r) => r.error)?.error;
  if (failed) {
    // 마이그레이션 156(coaches.sort_order) 적용 전
    if (failed.code === '42703' || /sort_order/.test(failed.message)) {
      return apiError('MIGRATION_REQUIRED', '코치 순서 칸(coaches.sort_order)이 아직 없습니다. 마이그레이션 156을 적용해 주세요.', 409);
    }
    return apiError('INTERNAL_ERROR', failed.message, 500);
  }
  return NextResponse.json({ data: { slugs } });
}
