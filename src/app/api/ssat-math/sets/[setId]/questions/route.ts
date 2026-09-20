import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  const { setId } = await params;
  const setNumber = parseInt(setId, 10);

  if (isNaN(setNumber) || setNumber < 1 || setNumber > 10) {
    return NextResponse.json(
      { error: { code: 'INVALID_SET', message: '유효하지 않은 세트 번호입니다.' } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('ssat_math_questions')
    .select('id, set_number, question_number, question_text, choice_a, choice_b, choice_c, choice_d, choice_e, difficulty, domain')
    .eq('set_number', setNumber)
    .order('question_number', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { questions: data ?? [] },
    meta: { requestId: crypto.randomUUID() },
  });
}
