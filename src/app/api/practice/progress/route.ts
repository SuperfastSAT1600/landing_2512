import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const testId = searchParams.get('testId');
  const instagramId = searchParams.get('instagramId');

  if (!testId || !instagramId) {
    return NextResponse.json({ progress: null });
  }

  const { data } = await supabaseAdmin
    .from('practice_progress')
    .select('current_index, answers, marked_for_review')
    .eq('test_id', testId)
    .eq('instagram_id', instagramId)
    .maybeSingle();

  return NextResponse.json({ progress: data ?? null });
}

export async function POST(req: NextRequest) {
  const { testId, instagramId, currentIndex, answers, markedForReview } = await req.json() as {
    testId: string;
    instagramId: string;
    currentIndex: number;
    answers: Record<string, string>;
    markedForReview?: string[];
  };

  if (!testId || !instagramId) {
    return NextResponse.json({ error: 'testId and instagramId are required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('practice_progress')
    .upsert(
      {
        test_id: testId,
        instagram_id: instagramId,
        current_index: currentIndex,
        answers,
        marked_for_review: markedForReview ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'test_id,instagram_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const testId = searchParams.get('testId');
  const instagramId = searchParams.get('instagramId');

  if (!testId || !instagramId) {
    return NextResponse.json({ error: 'testId and instagramId are required' }, { status: 400 });
  }

  await supabaseAdmin
    .from('practice_progress')
    .delete()
    .eq('test_id', testId)
    .eq('instagram_id', instagramId);

  return NextResponse.json({ ok: true });
}
