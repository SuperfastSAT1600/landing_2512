import { supabaseAdmin } from '@/lib/supabase-admin';
import { OctMathClient } from './OctMathClient';

export const dynamic = 'force-dynamic';

export default async function OctoberMathCheckPage() {
  const { data } = await supabaseAdmin
    .from('sat_problem_votes')
    .select('problem_id, vote_type');

  const counts: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    if (!counts[row.problem_id]) counts[row.problem_id] = { yes: 0, similar: 0, no: 0 };
    counts[row.problem_id][row.vote_type] = (counts[row.problem_id][row.vote_type] ?? 0) + 1;
  }

  return <OctMathClient initialCounts={counts} />;
}
