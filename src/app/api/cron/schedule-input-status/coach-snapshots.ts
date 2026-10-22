import { supabaseAdmin } from '@/lib/supabase-admin';
import type { CoachRatio, SnapshotValues } from './coach-ratio';

const KST_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** KST 기준 날짜 (YYYY-MM-DD) */
export function kstDate(date: Date): string {
  return new Date(date.getTime() + KST_MS).toISOString().slice(0, 10);
}

export const yesterdayKstDate = (now: Date): string => kstDate(new Date(now.getTime() - DAY_MS));

export async function loadSnapshot(snapshotDate: string): Promise<Map<string, SnapshotValues>> {
  const { data, error } = await supabaseAdmin
    .from('coach_schedule_snapshots')
    .select('coach_key, scheduled_hours, remaining_hours')
    .eq('snapshot_date', snapshotDate);
  if (error) throw new Error(`coach_schedule_snapshots load: ${error.message}`);
  return new Map((data ?? []).map(r => [
    r.coach_key as string,
    { scheduled_hours: Number(r.scheduled_hours), remaining_hours: Number(r.remaining_hours) },
  ]));
}

/** 같은 날 재발송하면 덮어쓴다 (PK = 날짜 + 코치). */
export async function saveSnapshot(snapshotDate: string, ratios: CoachRatio[]): Promise<void> {
  if (!ratios.length) return;
  const { error } = await supabaseAdmin.from('coach_schedule_snapshots').upsert(
    ratios.map(r => ({
      snapshot_date: snapshotDate,
      coach_key: r.key,
      coach_name: r.name,
      student_count: r.studentCount,
      scheduled_hours: Math.round(r.scheduledHours * 100) / 100,
      remaining_hours: Math.round(r.remainingHours * 100) / 100,
    })),
    { onConflict: 'snapshot_date,coach_key' },
  );
  if (error) throw new Error(`coach_schedule_snapshots save: ${error.message}`);
}
