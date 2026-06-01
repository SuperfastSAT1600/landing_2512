import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function maskId(raw: string): string {
  const handle = raw.startsWith('@') ? raw.slice(1) : raw;
  if (!handle) return '@***';
  return '@' + handle[0] + '***';
}

interface Submission {
  instagram_id: string | null;
  correct_count: number;
  total_count: number;
  question_results: Record<string, boolean> | null;
}

export async function GET(req: NextRequest) {
  const testId = req.nextUrl.searchParams.get('testId');
  if (!testId) {
    return NextResponse.json({ error: 'testId required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('practice_submissions')
    .select('instagram_id, correct_count, total_count, question_results')
    .eq('test_id', testId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Submission[];

  // Best submission per user for leaderboard
  const bestByUser = new Map<string, Submission>();
  for (const sub of rows) {
    const key = sub.instagram_id ?? '';
    const existing = bestByUser.get(key);
    if (!existing || sub.correct_count > existing.correct_count) {
      bestByUser.set(key, sub);
    }
  }

  const leaderboard = Array.from(bestByUser.values())
    .sort((a, b) => b.correct_count - a.correct_count || b.total_count - a.total_count)
    .map((sub, i) => ({
      rank: i + 1,
      maskedId: maskId(sub.instagram_id ?? ''),
      correctCount: sub.correct_count,
      totalCount: sub.total_count,
      score: sub.total_count > 0 ? Math.round((sub.correct_count / sub.total_count) * 100) : 0,
    }));

  // Per-question stats (only from submissions that included question_results)
  const questionStats: Record<string, { correct: number; total: number }> = {};
  for (const sub of rows) {
    const results = sub.question_results ?? {};
    for (const [qId, isCorrect] of Object.entries(results)) {
      if (!questionStats[qId]) questionStats[qId] = { correct: 0, total: 0 };
      questionStats[qId].total++;
      if (isCorrect) questionStats[qId].correct++;
    }
  }

  return NextResponse.json({ leaderboard, questionStats });
}
