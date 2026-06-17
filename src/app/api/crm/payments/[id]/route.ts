import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from('payments').delete().eq('id', id);

  if (error) {
    console.error('[payments DELETE]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}

/**
 * PATCH /api/crm/payments/[id]
 * 결제 담당자(created_by) 등 일부 필드 수동 수정. (과거 결제 담당자 보정용)
 * Body: { created_by?: string | null }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { created_by?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};
  if ('created_by' in body) updates.created_by = body.created_by?.trim() || null;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '수정할 항목이 없습니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('payments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[payments PATCH]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
