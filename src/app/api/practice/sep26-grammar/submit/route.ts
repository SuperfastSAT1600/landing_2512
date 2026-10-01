import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const TEST_ID = 'sep26-grammar-100';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { instagramId, answers, correctCount, totalCount, questionResults, markedForReview } = body as {
    instagramId: string;
    answers: Record<string, string>;
    correctCount: number;
    totalCount: number;
    questionResults?: Record<string, boolean>;
    markedForReview?: string[];
  };

  if (!instagramId) {
    return NextResponse.json({ error: 'instagramId is required' }, { status: 400 });
  }

  // Delete existing submission then insert fresh (one record per user per test)
  await supabaseAdmin
    .from('practice_submissions')
    .delete()
    .eq('test_id', TEST_ID)
    .eq('instagram_id', instagramId);

  const { data, error } = await supabaseAdmin
    .from('practice_submissions')
    .insert({
      test_id: TEST_ID,
      instagram_id: instagramId,
      student_name: null,
      answers,
      correct_count: correctCount,
      total_count: totalCount,
      question_results: questionResults ?? {},
      marked_for_review: markedForReview ?? [],
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
