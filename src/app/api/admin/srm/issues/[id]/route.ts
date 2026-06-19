import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { EventIssue, IssueChecklist } from '../route';
import { isAuthenticated } from '@/lib/server-auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const { checklist, status, description, title, resolution_note } = body;

  const updates: Partial<EventIssue> = {};
  if (checklist !== undefined) updates.checklist = checklist as IssueChecklist[];
  if (status !== undefined) updates.status = status;
  if (description !== undefined) updates.description = description;
  if (title !== undefined) updates.title = title;
  if (resolution_note !== undefined) updates.resolution_note = resolution_note;

  if (status === 'resolved') {
    (updates as Record<string, unknown>).resolved_at = new Date().toISOString();
  } else if (status === 'open') {
    (updates as Record<string, unknown>).resolved_at = null;
  }

  const { data, error } = await supabaseAdmin
    .from('srm_event_issues')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as EventIssue);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { error } = await supabaseAdmin
    .from('srm_event_issues')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
