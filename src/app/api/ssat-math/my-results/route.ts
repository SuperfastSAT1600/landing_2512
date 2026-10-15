import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('student_id')?.trim();
  if (!studentId) {
    return NextResponse.json(
      { error: { code: 'MISSING_STUDENT_ID', message: '학생 ID가 필요합니다.' } },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('ssat_math_results')
    .select('set_number, score, total')
    .eq('student_id', studentId);

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { results: data ?? [] } });
}
