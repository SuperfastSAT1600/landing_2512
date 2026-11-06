import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';
import { compareCoachOrder } from '@/lib/coach-roster';

// 과목 칸별 순서 컬럼(마이그레이션 164). 전체 순서 sort_order(156)는 칸 순서가 없을 때의 대체값으로만 읽는다
const COLUMN = { SAT: 'sort_order_sat', AP: 'sort_order_ap' } as const;
type Column = (typeof COLUMN)[keyof typeof COLUMN];
type Row = { slug: string; created_at: string; sort_order?: number | null } & Partial<Record<Column, number | null>>;

function parse(body: { slugs?: unknown; subject?: unknown } | null): { slugs: string[]; column: Column } | null {
  const slugs = Array.isArray(body?.slugs) && body.slugs.every((s) => typeof s === 'string') ? (body.slugs as string[]) : null;
  if (!slugs?.length || new Set(slugs).size !== slugs.length) return null;
  const subject = body?.subject;
  if (typeof subject !== 'string' || !Object.hasOwn(COLUMN, subject)) return null;
  return { slugs, column: COLUMN[subject as keyof typeof COLUMN] };
}

/** 화면에 없던 코치 — 그 칸의 기존 순서(null은 뒤) → 전체 순서 → 등록순 */
function restOrder(rows: Row[], column: Column): string[] {
  const base = (r: Row) => ({ sort_order: r.sort_order ?? null, created_at: r.created_at });
  return [...rows].sort((a, b) => {
    const x = a[column] ?? null, y = b[column] ?? null;
    if (x !== y) {
      if (x === null) return 1;
      if (y === null) return -1;
      return x - y;
    }
    return compareCoachOrder(base(a), base(b));
  }).map((r) => r.slug);
}

// PATCH /api/admin/coaches/order { subject: 'SAT'|'AP', slugs } — 코치 현황 과목 칸의 코치 순서(목록 위치).
export async function PATCH(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorized();
  const parsed = parse((await req.json().catch(() => null)) as { slugs?: unknown; subject?: unknown } | null);
  if (!parsed) return apiError('BAD_REQUEST', '코치 순서를 확인해 주세요.', 400);
  const { slugs, column } = parsed;

  // 화면에 없는 코치(비활동·다른 과목)도 뒤에 이어 붙여 전체를 0..n-1로 다시 매긴다 — 예전 값과 겹치지 않게
  const { data, error } = await supabaseAdmin.from('coaches').select('*');
  if (error) return apiError('INTERNAL_ERROR', error.message, 500);
  const all = (data ?? []) as Row[];
  const known = new Set(all.map((c) => c.slug));
  if (!slugs.every((s) => known.has(s))) return apiError('BAD_REQUEST', '없는 코치가 포함되어 있습니다.', 400);
  const given = new Set(slugs);
  const rest = restOrder(all.filter((c) => !given.has(c.slug)), column);

  const results = await Promise.all([...slugs, ...rest].map((slug, i) => supabaseAdmin.from('coaches').update({ [column]: i }).eq('slug', slug)));
  const failed = results.find((r) => r.error)?.error;
  if (failed) {
    // 컬럼 없음 — PostgREST는 update에 PGRST204, Postgres는 42703
    if (failed.code === 'PGRST204' || failed.code === '42703' || failed.message.includes(column)) {
      return apiError('MIGRATION_REQUIRED', `코치 순서 칸(coaches.${column})이 아직 없습니다. 마이그레이션 164를 적용해 주세요.`, 409);
    }
    return apiError('INTERNAL_ERROR', failed.message, 500);
  }
  return NextResponse.json({ data: { slugs } });
}
