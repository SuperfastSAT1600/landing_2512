import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { appendConsultationEntry } from '@/lib/consultation-timeline';
import { notifyPortalToolRequest } from '@/lib/slack';
import type { ConsultationEntry } from '@/types/crm';

const TOOL_MEMO_MARKERS: Record<string, string> = {
  'vocab-counter': '[포털 신청] Vocab Counter',
  'math-web': '[포털 신청] Math Web',
};

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

  const body = await request.json() as { toolId?: string };
  const { toolId } = body;
  if (!toolId || !TOOL_MEMO_MARKERS[toolId]) {
    return NextResponse.json({ error: 'Invalid toolId' }, { status: 400 });
  }

  const marker = TOOL_MEMO_MARKERS[toolId];

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select('id, name, portal_name, consultation_timeline')
    .eq('portal_token', token)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const existing: ConsultationEntry[] = Array.isArray(student.consultation_timeline)
    ? student.consultation_timeline
    : [];

  const alreadyApplied = existing.some((e) => e.raw_memo.includes(marker));
  if (alreadyApplied) {
    return NextResponse.json({ success: true, already: true });
  }

  await appendConsultationEntry(student.id, {
    raw_memo: `${marker} 사용을 신청했습니다.`,
    author: '포털 자동 기록',
    published: false,
  });

  const studentName = student.portal_name || student.name;
  try {
    await notifyPortalToolRequest({ studentName, toolId });
  } catch (e) {
    console.error('[tool-request] Slack notify failed:', e);
  }

  return NextResponse.json({ success: true });
}
