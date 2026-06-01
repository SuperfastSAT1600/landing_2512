import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { instagramId, studentName, answers, correctCount, totalCount } = body as {
    instagramId: string;
    studentName?: string;
    answers: Record<string, string>;
    correctCount: number;
    totalCount: number;
  };

  if (!instagramId) {
    return NextResponse.json({ error: 'instagramId is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('practice_submissions')
    .insert({
      test_id: 'quadratic-equations-30',
      instagram_id: instagramId,
      student_name: studentName ?? null,
      answers,
      correct_count: correctCount,
      total_count: totalCount,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
