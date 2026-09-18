import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { instagramId, answers, correctCount, totalCount, questionResults } = body as {
    instagramId: string;
    answers: Record<string, string>;
    correctCount: number;
    totalCount: number;
    questionResults?: Record<string, boolean>;
  };

  if (!instagramId) {
    return NextResponse.json({ error: 'instagramId is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('practice_submissions')
    .insert({
      test_id: 'september-rw-final-14',
      instagram_id: instagramId,
      student_name: null,
      answers,
      correct_count: correctCount,
      total_count: totalCount,
      question_results: questionResults ?? {},
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
