import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { generateEmbedding, buildEmbeddingText } from '@/lib/embedding';
import { FUNNEL_STAGE_LABELS } from '@/types/crm';
import { appendStageHistory } from '@/lib/stage-history';
import { apiError, unauthorized } from '@/lib/api-response';

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
  if (!isAuthenticated(request)) return unauthorized();

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return apiError('NOT_FOUND', 'Student not found', 404);
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
  if (!isAuthenticated(request)) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  // Strip undefined values and id field to avoid unintended overwrites
  const { id: _id, created_at: _ca, updated_at: _ua, ...updateFields } = body;

  if (Object.keys(updateFields).length === 0) {
    return apiError('BAD_REQUEST', 'No fields to update', 400);
  }

  // funnel_stage 변경 시 stage_history에 이동 이력 자동 기록
  if ('funnel_stage' in updateFields && typeof updateFields.funnel_stage === 'string') {
    const { data: current } = await supabaseAdmin
      .from('students')
      .select('stage_history')
      .eq('id', id)
      .single();

    const newStage = updateFields.funnel_stage as string;
    const label = FUNNEL_STAGE_LABELS[newStage as keyof typeof FUNNEL_STAGE_LABELS] ?? newStage;
    const history = appendStageHistory(current?.stage_history, newStage, label, new Date().toISOString());

    // 직전과 같은 단계면 이력이 그대로 돌아온다 — 불필요하게 덮어쓰지 않는다.
    if (history !== current?.stage_history) updateFields.stage_history = history;
  }

  // maybeSingle: 삭제된 리드를 수정하면 0행이 돌아온다. single()이면 PostgREST가
  // PGRST116("Cannot coerce the result to a single JSON object")를 DB 오류로 올려보내
  // 그 원문이 그대로 사용자 alert에 노출된다.
  const { data, error } = await supabaseAdmin
    .from('students')
    .update(updateFields)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[crm/students PATCH]', error);
    // Postgres 코드(예: 42501)를 그대로 넘긴다 — 권한·제약 위반을 구분하는 데 쓴다.
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: 500 }
    );
  }

  if (!data) {
    return apiError('STUDENT_NOT_FOUND', '이미 삭제된 리드입니다. 목록을 새로고침해 주세요.', 404);
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
  if (!isAuthenticated(request)) return unauthorized();

  const { error } = await supabaseAdmin
    .from('students')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[crm/students DELETE]', error);
    return apiError('INTERNAL_ERROR', 'Failed to delete student', 500);
  }

  return NextResponse.json({ data: null }, { status: 200 });
}
