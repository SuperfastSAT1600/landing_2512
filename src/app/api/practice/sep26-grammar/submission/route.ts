import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const TEST_ID = 'sep26-grammar-100';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const instagramId = searchParams.get('instagramId');

  if (!instagramId) {
    return NextResponse.json({ submission: null });
  }

  const { data } = await supabaseAdmin
    .from('practice_submissions')
    .select('id, answers, correct_count, total_count, question_results, marked_for_review')
    .eq('test_id', TEST_ID)
    .eq('instagram_id', instagramId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ submission: data ?? null });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const instagramId = searchParams.get('instagramId');

  if (!instagramId) {
    return NextResponse.json({ error: 'instagramId is required' }, { status: 400 });
  }

  await supabaseAdmin
    .from('practice_submissions')
    .delete()
    .eq('test_id', TEST_ID)
    .eq('instagram_id', instagramId);

  return NextResponse.json({ ok: true });
}
