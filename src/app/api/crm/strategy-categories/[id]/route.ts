import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: '카테고리 이름을 입력해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('strategy_categories')
    .update({ name: body.name.trim() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[strategy-categories PATCH]', error);
    return NextResponse.json({ error: '카테고리 수정에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { count, error: countError } = await supabaseAdmin
    .from('retry_strategies')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id);

  if (countError) {
    console.error('[strategy-categories DELETE count]', countError);
    return NextResponse.json({ error: '카테고리 삭제에 실패했습니다.' }, { status: 500 });
  }
  if (count && count > 0) {
    return NextResponse.json(
      { error: '이 카테고리에 속한 전략이 있어 삭제할 수 없습니다. 먼저 전략을 다른 카테고리로 옮기세요.' },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from('strategy_categories').delete().eq('id', id);

  if (error) {
    console.error('[strategy-categories DELETE]', error);
    return NextResponse.json({ error: '카테고리 삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: { id } });
}
