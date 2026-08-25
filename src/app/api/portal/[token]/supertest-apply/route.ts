import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { appendConsultationEntry } from '@/lib/consultation-timeline';
import { getSupertestConfig, saveSupertestConfig } from '@/lib/config';
import type { ConsultationEntry } from '@/types/crm';

const MEMO_MARKER = '[포털 신청] SuperTest';

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

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select('id, consultation_timeline')
    .eq('portal_token', token)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const existing: ConsultationEntry[] = Array.isArray(student.consultation_timeline)
    ? student.consultation_timeline
    : [];

  const alreadyApplied = existing.some((e) => e.raw_memo.includes(MEMO_MARKER));
  if (alreadyApplied) {
    return NextResponse.json({ success: true, already: true });
  }

  const config = await getSupertestConfig();
  const maxSlots = config.maxFreeSlots ?? 10;
  const currentCount = config.portalApplicantCount ?? 0;

  if (currentCount >= maxSlots) {
    return NextResponse.json({ error: 'Slots full' }, { status: 409 });
  }

  await appendConsultationEntry(student.id, {
    raw_memo: `${MEMO_MARKER} 무료 응시를 신청했습니다.`,
    author: '포털 자동 기록',
    published: false,
  });

  await saveSupertestConfig({ ...config, portalApplicantCount: currentCount + 1 });

  return NextResponse.json({ success: true });
}
