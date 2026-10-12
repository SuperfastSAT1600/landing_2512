import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEED_USERNAMES } from '@/data/seed-usernames';

export async function GET() {
  const [votesRes, customRes] = await Promise.all([
    supabaseAdmin
      .from('sat_problem_votes')
      .select('problem_id, instagram_username, vote_type, created_at')
      .like('problem_id', 'rw-%')
      .order('created_at', { ascending: false })
      .limit(20000),
    supabaseAdmin
      .from('sat_problem_comments')
      .select('id, comment, created_at')
      .eq('problem_id', 'rw-custom-submissions')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  // 가짜 데이터 제외
  const votes = (votesRes.data ?? []).filter(v => !SEED_USERNAMES.has(v.instagram_username));

  const participants = new Set(votes.map(v => v.instagram_username)).size;

  const voteCounts: Record<string, { yes: number; no: number }> = {};
  for (const v of votes) {
    if (!voteCounts[v.problem_id]) voteCounts[v.problem_id] = { yes: 0, no: 0 };
    const t = v.vote_type as 'yes' | 'no';
    if (t === 'yes' || t === 'no') voteCounts[v.problem_id][t]++;
  }

  const seen = new Set<string>();
  const realUsers: { username: string; created_at: string }[] = [];
  for (const v of votes) {
    if (!seen.has(v.instagram_username)) {
      seen.add(v.instagram_username);
      realUsers.push({ username: v.instagram_username, created_at: v.created_at });
    }
  }

  return NextResponse.json({
    participants,
    voteCounts,
    realUsers,
    customWords: customRes.data ?? [],
  });
}
