import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_SECRET_KEY;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json() as { is_active?: boolean; scope?: string };
  const updates: Record<string, unknown> = {};
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.scope !== undefined && ['vocab', 'mathweb', 'both'].includes(body.scope)) updates.scope = body.scope;

  const { error } = await supabaseAdmin
    .from('vocab_access_codes')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('vocab_access_codes')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
