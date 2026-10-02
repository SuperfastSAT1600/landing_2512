import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { isValidExamMonth, isValidSectionScore } from '@/lib/exam-score';
import { syncLatestExamScore } from '@/app/api/crm/_lib/syncLatestExamScore';
import { apiError, unauthorized } from '@/lib/api-response';

const SCORE_MESSAGE = '점수는 200~800 사이 10점 단위여야 합니다.';

/** PATCH — 오타 정정용 부분 수정. 보낸 필드만 바꾼다(빈 값으로 비우는 것도 허용). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const updates: Record<string, unknown> = {};

  if ('exam_month' in body) {
    const month = typeof body.exam_month === 'string' ? body.exam_month.trim() : '';
    if (!isValidExamMonth(month)) {
      return apiError('BAD_REQUEST', '시험월은 YYYY-MM 형식이어야 합니다.', 400);
    }
    updates.exam_month = month;
  }

  for (const field of ['rw_score', 'math_score'] as const) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value === null || value === '') {
      updates[field] = null;
      continue;
    }
    if (typeof value !== 'number' || !isValidSectionScore(value)) {
      return apiError('BAD_REQUEST', SCORE_MESSAGE, 400);
    }
    updates[field] = value;
  }

  if ('note' in body) {
    updates.note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;
  }

  if (Object.keys(updates).length === 0) {
    return apiError('BAD_REQUEST', '변경할 내용이 없습니다.', 400);
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('student_exam_scores')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return apiError('CONFLICT', '해당 시험월 성적이 이미 기록돼 있습니다.', 409);
    }
    if (error.code === 'PGRST116') {
      return apiError('NOT_FOUND', '시험 성적을 찾을 수 없습니다.', 404);
    }
    console.error('[crm/exam-scores PATCH]', error);
    return apiError('INTERNAL_ERROR', '시험 성적 수정에 실패했습니다.', 500);
  }
  if (!data) {
    return apiError('NOT_FOUND', '시험 성적을 찾을 수 없습니다.', 404);
  }

  await syncLatestExamScore(data.student_id);

  return NextResponse.json({ data });
}

/** DELETE — 잘못 넣은 회차 제거. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return unauthorized();

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('student_exam_scores')
    .select('student_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    console.error('[crm/exam-scores DELETE fetch]', fetchError);
    return apiError('INTERNAL_ERROR', '시험 성적 삭제에 실패했습니다.', 500);
  }
  if (!existing) {
    return apiError('NOT_FOUND', '시험 성적을 찾을 수 없습니다.', 404);
  }

  const { error } = await supabaseAdmin.from('student_exam_scores').delete().eq('id', id);
  if (error) {
    console.error('[crm/exam-scores DELETE]', error);
    return apiError('INTERNAL_ERROR', '시험 성적 삭제에 실패했습니다.', 500);
  }

  await syncLatestExamScore(existing.student_id);

  return NextResponse.json({ data: null });
}
