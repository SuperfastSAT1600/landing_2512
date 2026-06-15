import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import type { ConsultationEntry } from '@/types/crm';
import { parseAttachments } from '@/lib/crm-attachment';
import { randomUUID } from 'crypto';

/**
 * POST /api/crm/students/[id]/memo
 * Appends a new raw consultation memo to the student's consultation_timeline JSONB array.
 * Body: { raw_memo: string }
 * Requires admin authentication.
 */
export async function POST(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { raw_memo?: string; attachments?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const raw_memo = typeof body.raw_memo === 'string' ? body.raw_memo : '';
  const attachments = parseAttachments(body.attachments);
  if (attachments === null) {
    return NextResponse.json({ error: 'invalid attachments' }, { status: 400 });
  }
  // 텍스트나 첨부 중 하나는 있어야 한다(캡처만 공유하는 경우 허용).
  if (raw_memo.trim().length === 0 && attachments.length === 0) {
    return NextResponse.json({ error: 'raw_memo or attachments is required' }, { status: 400 });
  }

  // Fetch existing timeline
  const { data: student, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('consultation_timeline')
    .eq('id', id)
    .single();

  if (fetchError || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const existing: ConsultationEntry[] = Array.isArray(student.consultation_timeline)
    ? student.consultation_timeline
    : [];

  const newEntry: ConsultationEntry = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    raw_memo: raw_memo.trim(),
    published: false,
    ...(attachments.length > 0 ? { attachments } : {}),
  };

  const updatedTimeline = [...existing, newEntry];

  const { error } = await supabaseAdmin
    .from('students')
    .update({
      consultation_timeline: updatedTimeline,
      last_contacted_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[crm/memo POST]', error);
    return NextResponse.json({ error: 'Failed to append memo' }, { status: 500 });
  }

  return NextResponse.json({ data: newEntry }, { status: 201 });
}
