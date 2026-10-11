import { OctRwClient } from './OctRwClient';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const revalidate = 60;

async function getInitialCounts(): Promise<Record<string, { knew: number; didnt_know: number }>> {
  const { data } = await supabaseAdmin
    .from('sat_problem_votes')
    .select('problem_id, vote_type')
    .like('problem_id', 'rw-%')
    .limit(20000);

  const counts: Record<string, { knew: number; didnt_know: number }> = {};
  for (const row of data ?? []) {
    if (!counts[row.problem_id]) counts[row.problem_id] = { knew: 0, didnt_know: 0 };
    const t = row.vote_type as 'knew' | 'didnt_know';
    if (t === 'knew' || t === 'didnt_know') counts[row.problem_id][t]++;
  }
  return counts;
}

export default async function OctRwCheckPage() {
  const initialCounts = await getInitialCounts();
  return <OctRwClient initialCounts={initialCounts} />;
}
