import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { notifyPortalButtonClick } from '@/lib/slack';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const cookieStore = await cookies();
  const session = cookieStore.get(`portal_session_${token}`);
  if (!session || session.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { buttonLabel?: string };
  const { buttonLabel } = body;
  if (!buttonLabel) {
    return NextResponse.json({ error: 'buttonLabel is required' }, { status: 400 });
  }

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select('id, name, portal_name')
    .eq('portal_token', token)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  notifyPortalButtonClick({
    studentName: student.portal_name || student.name,
    studentId: student.id,
    buttonLabel,
  }).catch((err) => console.error('[button-click] Slack notify failed:', err));

  return NextResponse.json({ success: true });
}
