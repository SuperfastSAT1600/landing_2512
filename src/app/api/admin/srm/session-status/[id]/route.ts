import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'id required' } }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('srm_session_status_logs')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });

    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: String(e) } }, { status: 500 });
  }
}
