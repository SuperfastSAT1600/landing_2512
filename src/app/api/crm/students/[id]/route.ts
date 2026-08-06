import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { generateEmbedding, buildEmbeddingText } from '@/lib/embedding';
import { FUNNEL_STAGE_LABELS } from '@/types/crm';

/**
 * GET /api/crm/students/[id]
 * Returns student detail including full consultation_timeline.
 * Requires admin authentication.
 */
export async function GET(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

/**
 * PATCH /api/crm/students/[id]
 * Updates student fields (funnel_stage, churn handling, matching_stage, etc.).
 * matching_stage is stored on the students row; migration 016 omitted this column —
 * the update will silently succeed if the column does not yet exist in the DB.
 * Requires admin authentication.
 */
export async function PATCH(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Strip id/created_at/updated_at to avoid unintended overwrites
  const updateFields = { ...body };
  delete updateFields.id;
  delete updateFields.created_at;
  delete updateFields.updated_at;

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // funnel_stage 변경 시 stage_history에 이동 이력 자동 기록
  if ('funnel_stage' in updateFields && typeof updateFields.funnel_stage === 'string') {
    const { data: current } = await supabaseAdmin
      .from('students')
      .select('stage_history')
      .eq('id', id)
      .single();

    const newStage = updateFields.funnel_stage as string;
    const history: Array<{ stage: string; label: string; entered_at: string }> =
      Array.isArray(current?.stage_history) ? current.stage_history : [];

    history.push({
      stage: newStage,
      label: FUNNEL_STAGE_LABELS[newStage as keyof typeof FUNNEL_STAGE_LABELS] ?? newStage,
      entered_at: new Date().toISOString(),
    });
    updateFields.stage_history = history;
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[crm/students PATCH]', error);
    return NextResponse.json(
      { error: { message: error.message, code: error.code, details: error.details } },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  // 상담 기록 변경 시 임베딩 백그라운드 갱신
  if ('consultation_timeline' in updateFields || 'churn_tag' in updateFields || 'churn_type' in updateFields) {
    generateEmbedding(buildEmbeddingText(data)).then((embedding) =>
      supabaseAdmin.from('students').update({ embedding: JSON.stringify(embedding) }).eq('id', id)
    ).catch((err) => console.error('[embedding background update]', err));
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/crm/students/[id]
 * Deletes a student record (cascades to assignments).
 * Requires admin authentication.
 */
export async function DELETE(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from('students')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[crm/students DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }

  return NextResponse.json({ data: null }, { status: 200 });
}
