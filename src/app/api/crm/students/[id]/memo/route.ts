import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import type { ConsultationEntry } from '@/types/crm';
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

  let body: { raw_memo: string; author?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { raw_memo, author } = body;
  if (!raw_memo || typeof raw_memo !== 'string' || raw_memo.trim().length === 0) {
    return NextResponse.json({ error: 'raw_memo is required' }, { status: 400 });
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
    ...(author ? { author } : {}),
    published: false,
  };

  const updatedTimeline = [...existing, newEntry];

  const { data, error } = await supabaseAdmin
    .from('students')
    .update({
      consultation_timeline: updatedTimeline,
      last_contacted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('consultation_timeline')
    .single();

  if (error) {
    console.error('[crm/memo POST]', error);
    return NextResponse.json({ error: 'Failed to append memo' }, { status: 500 });
  }

  return NextResponse.json({ data: newEntry }, { status: 201 });
}
