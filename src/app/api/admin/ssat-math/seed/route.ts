import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ssatMathQuestions } from '@/data/ssat-math-questions';

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const { error } = await supabaseAdmin
    .from('ssat_math_questions')
    .upsert(ssatMathQuestions, { onConflict: 'set_number,question_number' });

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: { inserted: ssatMathQuestions.length },
    meta: { requestId: crypto.randomUUID() },
  });
}
