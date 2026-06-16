import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type RosterGroup = 'paused';

export interface RosterStudent {
  crmStudentId: string;
  name: string;
  grade: string | null;
  sfv2ProfileId: string | null;
  isPaused: boolean;
  group: RosterGroup;
}

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // 활성 휴원 레코드 조회
    const { data: pauseRows, error: pauseError } = await supabaseAdmin
      .from('student_pauses')
      .select('student_id, sfv2_profile_id, pause_start, pause_until')
      .is('ended_at', null)
      .lte('pause_start', today)
      .or(`pause_until.is.null,pause_until.gte.${today}`);

    if (pauseError) return NextResponse.json({ error: pauseError.message }, { status: 500 });
    if (!pauseRows?.length) return NextResponse.json([]);

    const pausedStudentIds = [...new Set(pauseRows.map((p) => p.student_id).filter(Boolean) as string[])];

    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id, name, grade, sfv2_profile_id')
      .in('id', pausedStudentIds)
      .order('name');

    if (studentsError) return NextResponse.json({ error: studentsError.message }, { status: 500 });

    const result: RosterStudent[] = (students ?? []).map((s) => ({
      crmStudentId: s.id,
      name: s.name,
      grade: (s as unknown as { grade: string | null }).grade ?? null,
      sfv2ProfileId: s.sfv2_profile_id ?? null,
      isPaused: true,
      group: 'paused' as const,
    }));

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[srm/roster] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
