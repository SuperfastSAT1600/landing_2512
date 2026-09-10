import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { isValidExamMonth, isValidSectionScore } from '@/lib/exam-score';

const SCORE_MESSAGE = '점수는 200~800 사이 10점 단위여야 합니다.';

/** PATCH — 오타 정정용 부분 수정. 보낸 필드만 바꾼다(빈 값으로 비우는 것도 허용). */
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

  if ('exam_month' in body) {
    const month = typeof body.exam_month === 'string' ? body.exam_month.trim() : '';
    if (!isValidExamMonth(month)) {
      return NextResponse.json({ error: '시험월은 YYYY-MM 형식이어야 합니다.' }, { status: 400 });
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
      return NextResponse.json({ error: SCORE_MESSAGE }, { status: 400 });
    }
    updates[field] = value;
  }

  if ('note' in body) {
    updates.note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 });
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
      return NextResponse.json({ error: '해당 시험월 성적이 이미 기록돼 있습니다.' }, { status: 409 });
    }
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: '시험 성적을 찾을 수 없습니다.' }, { status: 404 });
    }
    console.error('[crm/exam-scores PATCH]', error);
    return NextResponse.json({ error: '시험 성적 수정에 실패했습니다.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: '시험 성적을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

/** DELETE — 잘못 넣은 회차 제거. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from('student_exam_scores').delete().eq('id', id);
  if (error) {
    console.error('[crm/exam-scores DELETE]', error);
    return NextResponse.json({ error: '시험 성적 삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: null });
}
