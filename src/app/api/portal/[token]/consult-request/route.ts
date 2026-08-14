import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { notifyPortalConsultRequest } from '@/lib/slack';

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

  const body = await request.json() as { date?: string; time?: string };
  const { date, time } = body;
  if (!date || !time) {
    return NextResponse.json({ error: 'date and time are required' }, { status: 400 });
  }

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select('id, name, portal_name')
    .eq('portal_token', token)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const studentName = student.portal_name || student.name;

  await notifyPortalConsultRequest({
    studentName,
    preferredDate: date,
    preferredTime: time,
  });

  return NextResponse.json({ success: true });
}
