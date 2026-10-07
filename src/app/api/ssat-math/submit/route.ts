import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface SubmitBody {
  student_id: string;
  set_number: number;
  answers: Record<string, string>;
  elapsed_seconds?: number;
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  let body: SubmitBody;
  try {
    body = await req.json() as SubmitBody;
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: '잘못된 요청입니다.' } },
      { status: 400 }
    );
  }

  const { student_id, set_number, answers, elapsed_seconds } = body;

  if (!student_id?.trim() || !set_number || !answers) {
    return NextResponse.json(
      { error: { code: 'MISSING_FIELDS', message: '필수 항목이 누락되었습니다.' } },
      { status: 400 }
    );
  }

  const { data: questions, error: qErr } = await supabaseAdmin
    .from('ssat_math_questions')
    .select('id, question_number, correct_answer')
    .eq('set_number', set_number);

  if (qErr || !questions) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: '문제를 불러올 수 없습니다.' } },
      { status: 500 }
    );
  }

  const gradedDetail: Record<string, { answer: string; correct: string; is_correct: boolean }> = {};
  let score = 0;

  for (const q of questions) {
    const given = answers[q.id] ?? '';
    const isCorrect = given.toUpperCase() === q.correct_answer.toUpperCase();
    if (isCorrect) score++;
    gradedDetail[q.id] = {
      answer: given,
      correct: q.correct_answer,
      is_correct: isCorrect,
    };
  }

  const { error: upsertErr } = await supabaseAdmin
    .from('ssat_math_results')
    .upsert(
      {
        student_id: student_id.trim(),
        set_number,
        answers,
        score,
        total: questions.length,
        elapsed_seconds: elapsed_seconds ?? null,
        graded_detail: gradedDetail,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,set_number' }
    );

  if (upsertErr) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: upsertErr.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { score, total: questions.length, graded_detail: gradedDetail },
    meta: { requestId },
  });
}
