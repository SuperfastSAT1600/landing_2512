import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import type { ConsultationEntry } from '@/types/crm';

interface PublishMemoBody {
  entry_id: string;
  ai_purified: string;
  ai_deleted_items: string[];
  ai_coach_history: string;
}

/**
 * POST /api/crm/students/[id]/publish-memo
 * Approves the AI-processed version of a memo and marks it as visible to parents.
 * Finds the entry by entry_id in consultation_timeline, updates it, and sets published=true.
 * Body: { entry_id, ai_purified, ai_deleted_items, ai_coach_history }
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

  let body: PublishMemoBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { entry_id, ai_purified, ai_deleted_items, ai_coach_history } = body;

  if (!entry_id || !ai_purified) {
    return NextResponse.json({ error: 'entry_id and ai_purified are required' }, { status: 400 });
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

  const timeline: ConsultationEntry[] = Array.isArray(student.consultation_timeline)
    ? student.consultation_timeline
    : [];

  const entryIndex = timeline.findIndex((e) => e.id === entry_id);
  if (entryIndex === -1) {
    return NextResponse.json({ error: 'Memo entry not found' }, { status: 404 });
  }

  const updatedEntry: ConsultationEntry = {
    ...timeline[entryIndex],
    ai_purified,
    ai_deleted_items: Array.isArray(ai_deleted_items) ? ai_deleted_items : [],
    ai_coach_history: ai_coach_history ?? '',
    published: true,
  };

  const updatedTimeline = [
    ...timeline.slice(0, entryIndex),
    updatedEntry,
    ...timeline.slice(entryIndex + 1),
  ];

  const { error } = await supabaseAdmin
    .from('students')
    .update({ consultation_timeline: updatedTimeline })
    .eq('id', id);

  if (error) {
    console.error('[crm/publish-memo POST]', error);
    return NextResponse.json({ error: 'Failed to publish memo' }, { status: 500 });
  }

  return NextResponse.json({ data: updatedEntry });
}
