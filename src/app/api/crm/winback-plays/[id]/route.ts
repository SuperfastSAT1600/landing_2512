import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

// PATCH 허용 필드 화이트리스트 (experiments/[id] 관례).
const EDITABLE = [
  'title',
  'product_brief',
  'product_category',
  'product_price',
  'product_hours',
  'target_exam_date',
  'audience_hint',
  'rule_filters',
  'conversion_window_days',
  'contact_cooldown_days',
  'status',
  'retrospective',
] as const;

const STUDENT_COLUMNS = 'id, name, grade, parent_phone, lead_status, churn_tag';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const [playRes, variantRes, targetRes] = await Promise.all([
    supabaseAdmin.from('winback_plays').select('*').eq('id', id).single(),
    supabaseAdmin.from('winback_play_variants').select('*').eq('play_id', id).order('sort_order'),
    supabaseAdmin
      .from('winback_targets')
      .select(`*, student:students(${STUDENT_COLUMNS})`)
      .eq('play_id', id)
      .neq('status', 'skipped')
      .order('rank', { ascending: true, nullsFirst: false }),
  ]);

  if (playRes.error || !playRes.data) {
    return NextResponse.json({ error: '플레이를 찾을 수 없습니다.' }, { status: 404 });
  }
  if (targetRes.error) {
    console.error('[winback-plays/[id] GET targets]', targetRes.error);
    return NextResponse.json(
      { error: `타겟을 불러오지 못했습니다: ${targetRes.error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { ...playRes.data, variants: variantRes.data ?? [], targets: targetRes.data ?? [] },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of EDITABLE) {
    if (key in body) update[key] = body[key];
  }

  const { data, error } = await supabaseAdmin
    .from('winback_plays')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[winback-plays/[id] PATCH]', error);
    return NextResponse.json({ error: `수정에 실패했습니다: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  // 타겟·변형은 ON DELETE CASCADE로 함께 지워진다. 학생 쪽 미러 기록(상담메모)은 남는다 — 발송 사실이므로.
  const { error } = await supabaseAdmin.from('winback_plays').delete().eq('id', id);
  if (error) {
    console.error('[winback-plays/[id] DELETE]', error);
    return NextResponse.json({ error: `삭제에 실패했습니다: ${error.message}` }, { status: 500 });
  }
  return NextResponse.json({ data: { id } });
}
