import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function PATCH(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { segment?: 'b2c' | 'b2b'; ordered_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.segment !== 'b2c' && body.segment !== 'b2b') {
    return NextResponse.json({ error: 'segment(b2c|b2b)를 지정해주세요.' }, { status: 400 });
  }
  if (!Array.isArray(body.ordered_ids) || body.ordered_ids.length === 0) {
    return NextResponse.json({ error: 'ordered_ids가 필요합니다.' }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('strategy_categories')
    .select('id')
    .eq('segment', body.segment);

  if (fetchError) {
    console.error('[strategy-categories reorder fetch]', fetchError);
    return NextResponse.json({ error: '순서 변경에 실패했습니다.' }, { status: 500 });
  }

  const existingIds = new Set((existing ?? []).map((r) => (r as { id: string }).id));
  const incomingIds = new Set(body.ordered_ids);
  const sameSet =
    existingIds.size === incomingIds.size && [...existingIds].every((id) => incomingIds.has(id));

  if (!sameSet) {
    return NextResponse.json(
      { error: 'ordered_ids가 현재 카테고리 목록과 일치하지 않습니다.' },
      { status: 400 }
    );
  }

  const updates = body.ordered_ids.map((id, index) =>
    supabaseAdmin.from('strategy_categories').update({ sort_order: index }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);

  if (failed?.error) {
    console.error('[strategy-categories reorder update]', failed.error);
    return NextResponse.json({ error: '순서 변경에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: { segment: body.segment, ordered_ids: body.ordered_ids } });
}
