import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function isAuthorized(req: NextRequest) {
  return req.headers.get('x-admin-key') === process.env.ADMIN_KEY;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { isActive } = body as { isActive?: boolean };

  if (typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive (boolean) is required' }, { status: 400 });
  }

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('test_codes')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
