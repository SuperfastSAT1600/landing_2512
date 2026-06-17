import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { fetchDailyLearning } from '@/lib/learning-data';
import { cookies } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Verify session cookie OR admin key header
  const cookieStore = await cookies();
  const session = cookieStore.get(`partner_session_${token}`);
  const adminKeyHeader = req.headers.get('x-admin-key');
  const isAdminRequest = adminKeyHeader && adminKeyHeader === process.env.ADMIN_SECRET_KEY;

  if (!isAdminRequest && (!session || session.value !== 'authenticated')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch partner config (student list)
  const { data: portal, error } = await supabaseAdmin
    .from('partner_portals')
    .select('student_names')
    .eq('token', token)
    .single();

  if (error || !portal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const names = (portal.student_names as string[]) ?? [];

  try {
    const data = await fetchDailyLearning(names, date);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
