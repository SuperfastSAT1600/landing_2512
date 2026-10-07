import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';

export const runtime = 'nodejs';

export interface ActiveStudentCountResponse {
  data: {
    total: number;
    onboarding: number;
    active: number;
    paused: number;
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseSFv2
      .from('payments')
      .select('student_id, management_status')
      .in('management_status', ['active', 'onboarding', 'paused'])
      .not('student_id', 'is', null);

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      );
    }

    // count distinct student_id per status
    const countByStatus: Record<string, Set<string>> = {
      active: new Set(),
      onboarding: new Set(),
      paused: new Set(),
    };
    for (const row of data ?? []) {
      if (row.student_id && row.management_status in countByStatus) {
        countByStatus[row.management_status].add(row.student_id);
      }
    }

    const active = countByStatus.active.size;
    const onboarding = countByStatus.onboarding.size;
    const paused = countByStatus.paused.size;

    // total = distinct students (a student could have multiple payments)
    const allIds = new Set([...countByStatus.active, ...countByStatus.onboarding, ...countByStatus.paused]);

    return NextResponse.json({
      data: { total: allIds.size, onboarding, active, paused },
    } satisfies ActiveStudentCountResponse);
  } catch (e) {
    console.error('[active-student-count] 오류:', e);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
