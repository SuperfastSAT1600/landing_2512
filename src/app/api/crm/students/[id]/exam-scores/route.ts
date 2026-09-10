import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { isValidExamMonth, isValidSectionScore } from '@/lib/exam-score';

const SCORE_MESSAGE = '점수는 200~800 사이 10점 단위여야 합니다.';

/** 미지정(undefined·null)은 null 로, 그 외에는 유효한 섹션 점수만 통과시킨다. */
function readScore(value: unknown): number | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  return typeof value === 'number' && isValidSectionScore(value) ? value : 'invalid';
}

/** GET — 학생의 실제 응시 성적을 최신 회차부터 반환한다. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('student_exam_scores')
    .select('*')
    .eq('student_id', id)
    .order('exam_month', { ascending: false });

  if (error) {
    console.error('[crm/exam-scores GET]', error);
    return NextResponse.json({ error: '시험 성적을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

/** POST — 회차 하나를 기록한다. 총점은 저장하지 않고 조회 측에서 합산한다. */
export async function POST(
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

  const examMonth = typeof body.exam_month === 'string' ? body.exam_month.trim() : '';
  if (!isValidExamMonth(examMonth)) {
    return NextResponse.json({ error: '시험월은 YYYY-MM 형식이어야 합니다.' }, { status: 400 });
  }

  const rw = readScore(body.rw_score);
  const math = readScore(body.math_score);
  if (rw === 'invalid' || math === 'invalid') {
    return NextResponse.json({ error: SCORE_MESSAGE }, { status: 400 });
  }
  if (rw === null && math === null) {
    return NextResponse.json({ error: 'RW 또는 Math 점수 중 하나는 필요합니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('student_exam_scores')
    .insert({
      student_id: id,
      exam_month: examMonth,
      rw_score: rw,
      math_score: math,
      note: typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null,
      created_by: typeof body.created_by === 'string' && body.created_by.trim() ? body.created_by.trim() : null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `${examMonth} 시험 성적이 이미 기록돼 있습니다.` },
        { status: 409 }
      );
    }
    console.error('[crm/exam-scores POST]', error);
    return NextResponse.json({ error: '시험 성적 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
