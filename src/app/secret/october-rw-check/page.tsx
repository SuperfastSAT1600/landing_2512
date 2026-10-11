import { OctRwClient } from './OctRwClient';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const revalidate = 60;

async function getInitialCounts(): Promise<Record<string, { yes: number; no: number }>> {
  const { data } = await supabaseAdmin
    .from('sat_problem_votes')
    .select('problem_id, vote_type')
    .like('problem_id', 'rw-%')
    .limit(20000);

  const counts: Record<string, { yes: number; no: number }> = {};
  for (const row of data ?? []) {
    if (!counts[row.problem_id]) counts[row.problem_id] = { yes: 0, no: 0 };
    const t = row.vote_type as string;
    if (t === 'yes') counts[row.problem_id].yes++;
    else if (t === 'no') counts[row.problem_id].no++;
  }
  return counts;
}

export default async function OctRwCheckPage() {
  const initialCounts = await getInitialCounts();
  return <OctRwClient initialCounts={initialCounts} />;
}
