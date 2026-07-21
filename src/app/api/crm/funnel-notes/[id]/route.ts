import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

const EDITABLE = ['week_start', 'content', 'stage_key'] as const;

// PATCH /api/crm/funnel-notes/:id
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of EDITABLE) if (k in body) update[k] = body[k] === '' && k === 'week_start' ? null : body[k];

  const { data, error } = await supabaseAdmin
    .from('funnel_notes')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[funnel-notes PATCH]', error);
    return NextResponse.json({ error: '주석 수정에 실패했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// DELETE /api/crm/funnel-notes/:id
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { error } = await supabaseAdmin.from('funnel_notes').delete().eq('id', id);
  if (error) {
    console.error('[funnel-notes DELETE]', error);
    return NextResponse.json({ error: '주석 삭제에 실패했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ data: { id } });
}
