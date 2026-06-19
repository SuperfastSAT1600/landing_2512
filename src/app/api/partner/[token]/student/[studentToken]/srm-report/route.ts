import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { buildSrmReport } from '@/lib/build-srm-report';
import type { LearningReport } from '@/types/srm-portal';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; studentToken: string }> }
) {
  const { token, studentToken } = await params;

  const cookieStore = await cookies();
  const session = cookieStore.get(`partner_session_${token}`);
  const adminKey = req.headers.get('x-admin-key');
  const isAdmin = adminKey && adminKey === process.env.ADMIN_SECRET_KEY;

  if (!isAdmin && (!session || session.value !== 'authenticated')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: portal, error: portalError } = await supabaseAdmin
    .from('partner_portals')
    .select('name')
    .eq('token', token)
    .single();

  if (portalError || !portal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: student } = await supabaseAdmin
    .from('students')
    .select('sfv2_profile_id')
    .eq('portal_token', studentToken)
    .eq('b2b_partner', portal.name as string)
    .single();

  if (!student?.sfv2_profile_id) {
    return NextResponse.json({ error: 'no_v2_profile' }, { status: 404 });
  }

  const report: LearningReport = await buildSrmReport(student.sfv2_profile_id);
  return NextResponse.json(report);
}
