import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET: 모든 단어의 vote count 집계
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sat_problem_votes')
    .select('problem_id, vote_type')
    .like('problem_id', 'rw-%')
    .limit(20000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    if (!counts[row.problem_id]) counts[row.problem_id] = { knew: 0, didnt_know: 0 };
    counts[row.problem_id][row.vote_type] = (counts[row.problem_id][row.vote_type] ?? 0) + 1;
  }

  return NextResponse.json({ counts });
}

// POST: 투표 (upsert)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { word_id, instagram_username, vote_type } = body;

  if (!word_id || !instagram_username || !['knew', 'didnt_know'].includes(vote_type)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('sat_problem_votes')
    .upsert(
      { problem_id: word_id, instagram_username: instagram_username.toLowerCase().trim(), vote_type },
      { onConflict: 'problem_id,instagram_username' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
