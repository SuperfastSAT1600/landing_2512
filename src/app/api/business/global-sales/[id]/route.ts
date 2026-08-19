import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin.from('global_sales').delete().eq('id', id);

  if (error) {
    console.error('[global-sales DELETE]', error);
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ data: { id } });
}
