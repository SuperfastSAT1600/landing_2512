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

  let body: { name?: string; description?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('retry_strategies')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[retry-strategies PATCH]', error);
    return NextResponse.json({ error: '전략 수정에 실패했습니다.' }, { status: 500 });
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

  // 해당 전략에 속한 학생들을 전략에서 해제 (ON DELETE SET NULL이 처리하지만 명시적으로)
  await supabaseAdmin
    .from('students')
    .update({ retry_strategy_id: null, retry_stage: null, retry_assigned_at: null })
    .eq('retry_strategy_id', id);

  const { error } = await supabaseAdmin
    .from('retry_strategies')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[retry-strategies DELETE]', error);
    return NextResponse.json({ error: '전략 삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: { id } });
}
