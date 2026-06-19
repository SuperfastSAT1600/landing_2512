import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

// PATCH로 수정 허용하는 필드 화이트리스트
const EDITABLE = [
  'title', 'hypothesis', 'execution_plan', 'segment_source', 'metric_key',
  'custom_metric_label', 'baseline_from', 'baseline_to', 'baseline_value',
  'test_from', 'test_to', 'result_value', 'target_value', 'status',
  'verdict', 'retrospective',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('growth_experiments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[experiments PATCH]', error);
    return NextResponse.json({ error: '실험 수정에 실패했습니다.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
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

  const { error } = await supabaseAdmin.from('growth_experiments').delete().eq('id', id);
  if (error) {
    console.error('[experiments DELETE]', error);
    return NextResponse.json({ error: '실험 삭제에 실패했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ data: null }, { status: 200 });
}
