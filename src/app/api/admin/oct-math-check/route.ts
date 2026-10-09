import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEED_USERNAMES } from '@/data/seed-usernames';

export async function GET() {
  const [votesRes, commentsRes] = await Promise.all([
    supabaseAdmin
      .from('sat_problem_votes')
      .select('problem_id, instagram_username, vote_type, created_at')
      .order('created_at', { ascending: false })
      .limit(20000),
    supabaseAdmin
      .from('sat_problem_comments')
      .select('problem_id, comment, created_at')
      .order('created_at', { ascending: false }),
  ]);

  const allVotes = votesRes.data ?? [];
  const comments = commentsRes.data ?? [];

  // 가짜 데이터 제외
  const votes = allVotes.filter(v => !SEED_USERNAMES.has(v.instagram_username));

  // 고유 참여자 수 (실제 유저만)
  const participants = new Set(votes.map(v => v.instagram_username)).size;

  // 문제별 투표 집계 (실제 유저만)
  const voteCounts: Record<string, { yes: number; similar: number; no: number }> = {};
  for (const v of votes) {
    if (!voteCounts[v.problem_id]) voteCounts[v.problem_id] = { yes: 0, similar: 0, no: 0 };
    const t = v.vote_type as 'yes' | 'similar' | 'no';
    if (t === 'yes' || t === 'similar' || t === 'no') voteCounts[v.problem_id][t]++;
  }

  // 문제별 코멘트 그룹
  const commentsByProblem: Record<string, { comment: string; created_at: string }[]> = {};
  for (const c of comments) {
    if (!commentsByProblem[c.problem_id]) commentsByProblem[c.problem_id] = [];
    commentsByProblem[c.problem_id].push({ comment: c.comment, created_at: c.created_at });
  }

  // 실제 참여자 목록 (최신순, 중복 제거)
  const seen = new Set<string>();
  const realUsers: { username: string; created_at: string }[] = [];
  for (const v of votes) {
    if (!seen.has(v.instagram_username)) {
      seen.add(v.instagram_username);
      realUsers.push({ username: v.instagram_username, created_at: v.created_at });
    }
  }

  return NextResponse.json({ participants, voteCounts, commentsByProblem, realUsers });
}
