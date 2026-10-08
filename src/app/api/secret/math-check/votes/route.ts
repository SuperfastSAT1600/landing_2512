import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET: 모든 문제의 vote count 집계
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sat_problem_votes')
    .select('problem_id, vote_type');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // { [problemId]: { yes: n, similar: n, no: n } }
  const counts: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    if (!counts[row.problem_id]) counts[row.problem_id] = { yes: 0, similar: 0, no: 0 };
    counts[row.problem_id][row.vote_type] = (counts[row.problem_id][row.vote_type] ?? 0) + 1;
  }

  return NextResponse.json({ counts });
}

// POST: 투표 (upsert — 같은 인스타 아이디 재투표 시 덮어씌움)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { problem_id, instagram_username, vote_type } = body;

  if (!problem_id || !instagram_username || !['yes', 'similar', 'no'].includes(vote_type)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('sat_problem_votes')
    .upsert(
      { problem_id, instagram_username: instagram_username.toLowerCase().trim(), vote_type },
      { onConflict: 'problem_id,instagram_username' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
