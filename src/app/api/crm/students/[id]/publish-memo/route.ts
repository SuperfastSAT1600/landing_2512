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

interface PatchMemoBody {
  entry_id: string;
  action: 'unpublish' | 'delete_ai';
}

/**
 * PATCH /api/crm/students/[id]/publish-memo
 * Modifies the publish state of a memo entry without changing AI content (unpublish),
 * or clears AI-generated fields and unpublishes (delete_ai).
 * Body: { entry_id, action: 'unpublish' | 'delete_ai' }
 * Requires admin authentication.
 */
export async function PATCH(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PatchMemoBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { entry_id, action } = body;

  if (!entry_id || !action) {
    return NextResponse.json({ error: 'entry_id and action are required' }, { status: 400 });
  }

  if (action !== 'unpublish' && action !== 'delete_ai') {
    return NextResponse.json({ error: 'action must be "unpublish" or "delete_ai"' }, { status: 400 });
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

  const base = timeline[entryIndex];

  const updatedEntry: ConsultationEntry =
    action === 'delete_ai'
      ? {
          ...base,
          published: false,
          ai_purified: '',
          ai_deleted_items: [],
          ai_coach_history: '',
        }
      : {
          ...base,
          published: false,
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
    console.error('[crm/publish-memo PATCH]', error);
    return NextResponse.json({ error: 'Failed to update memo' }, { status: 500 });
  }

  return NextResponse.json({ data: updatedEntry });
}
