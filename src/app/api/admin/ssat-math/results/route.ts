import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const setNumberStr = searchParams.get('set_number');
  const setNumber = setNumberStr ? parseInt(setNumberStr, 10) : null;

  let query = supabaseAdmin
    .from('ssat_math_results')
    .select('id, student_id, set_number, score, total, elapsed_seconds, graded_detail, submitted_at')
    .order('submitted_at', { ascending: false });

  if (setNumber && !isNaN(setNumber)) {
    query = query.eq('set_number', setNumber);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: data ?? [],
    meta: { requestId: crypto.randomUUID() },
  });
}
