import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { buildSrmReport } from '@/lib/build-srm-report';
import { logLeadEvent, LEAD_EVENT_DEDUP_MINUTES } from '@/lib/lead-events';
import type { LearningReport } from '@/types/srm-portal';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const cookieStore = await cookies();
  const session = cookieStore.get(`portal_session_${token}`);
  if (!session || session.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('id, sfv2_profile_id')
    .eq('portal_token', token)
    .single();

  if (!student?.sfv2_profile_id) {
    return NextResponse.json({ error: 'no_v2_profile' }, { status: 404 });
  }

  const report: LearningReport = await buildSrmReport(student.sfv2_profile_id);
  await logLeadEvent(student.id, 'srm_report_viewed', { dedupMinutes: LEAD_EVENT_DEDUP_MINUTES });
  return NextResponse.json(report);
}
