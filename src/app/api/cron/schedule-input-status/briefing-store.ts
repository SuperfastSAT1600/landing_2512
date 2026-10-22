import { supabaseAdmin } from '@/lib/supabase-admin';
import type { BriefingPayload } from './briefing-payload';

/** KST 날짜(YYYY-MM-DD)별 저장. 같은 날 재발송하면 덮어쓴다. */
export async function saveBriefing(briefingDate: string, payload: BriefingPayload): Promise<void> {
  const { error } = await supabaseAdmin
    .from('schedule_briefing_snapshots')
    .upsert({ briefing_date: briefingDate, payload }, { onConflict: 'briefing_date' });
  if (error) throw new Error(`schedule_briefing_snapshots save: ${error.message}`);
}

export async function loadBriefing(briefingDate: string): Promise<BriefingPayload | null> {
  const { data, error } = await supabaseAdmin
    .from('schedule_briefing_snapshots')
    .select('payload')
    .eq('briefing_date', briefingDate)
    .maybeSingle();
  if (error) throw new Error(`schedule_briefing_snapshots load: ${error.message}`);
  return (data?.payload as BriefingPayload | undefined) ?? null;
}

/** 저장된 날짜 목록, 최신순 */
export async function listBriefingDates(limit = 60): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('schedule_briefing_snapshots')
    .select('briefing_date')
    .order('briefing_date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`schedule_briefing_snapshots list: ${error.message}`);
  return (data ?? []).map(r => r.briefing_date as string);
}
