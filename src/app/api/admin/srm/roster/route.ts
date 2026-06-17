import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type RosterGroup = 'active' | 'paused';

export interface RosterStudent {
  crmStudentId: string;
  name: string;
  grade: string | null;
  sfv2ProfileId: string | null;
  isPaused: boolean;
  hasSummerProgram: boolean;
  group: RosterGroup;
}

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: students, error: studentsError }, { data: pauseRows }, { data: summerRows }] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select('id, name, grade, sfv2_profile_id')
        .eq('lead_status', 'enrolled')
        .order('name'),
      supabaseAdmin
        .from('student_pauses')
        .select('student_id, sfv2_profile_id')
        .is('ended_at', null)
        .lte('pause_start', today)
        .or(`pause_until.is.null,pause_until.gte.${today}`),
      supabaseAdmin
        .from('payments')
        .select('student_id')
        .ilike('product', '%여름방학%')
        .gte('paid_at', '2026-01-01'),
    ]);

    if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 });

    const pausedByStudentId = new Set((pauseRows ?? []).map((p) => p.student_id).filter(Boolean) as string[]);
    const pausedByProfileId = new Set((pauseRows ?? []).map((p) => p.sfv2_profile_id).filter(Boolean) as string[]);
    const summerStudentIds = new Set((summerRows ?? []).map((p) => p.student_id).filter(Boolean) as string[]);

    const result: RosterStudent[] = (students ?? []).map((s) => {
      const isPaused =
        pausedByStudentId.has(s.id) ||
        (s.sfv2_profile_id ? pausedByProfileId.has(s.sfv2_profile_id) : false);
      return {
        crmStudentId: s.id,
        name: s.name,
        grade: (s as unknown as { grade: string | null }).grade ?? null,
        sfv2ProfileId: s.sfv2_profile_id ?? null,
        isPaused,
        hasSummerProgram: summerStudentIds.has(s.id),
        group: isPaused ? 'paused' : 'active',
      };
    });

    // 수업중 먼저, 휴원 나중
    result.sort((a, b) => {
      if (a.group !== b.group) return a.group === 'active' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[srm/roster] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
