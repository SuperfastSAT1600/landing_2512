import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { aggregateWinbackDashboard } from '@/lib/winback/dashboard';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const [play, targets, variants] = await Promise.all([
    supabaseAdmin.from('winback_plays').select('id').eq('id', id).single(),
    supabaseAdmin.from('winback_targets').select('status,variant_id,sent_at,response,reconnected_at,converted_at,conversion_amount').eq('play_id', id),
    supabaseAdmin.from('winback_play_variants').select('id,name').eq('play_id', id).order('sort_order'),
  ]);
  if (play.error || !play.data) return NextResponse.json({ error: '플레이를 찾을 수 없습니다.' }, { status: 404 });
  if (targets.error || variants.error) {
    console.error('[winback-plays/[id]/dashboard]', targets.error ?? variants.error);
    return NextResponse.json({ error: '성과를 불러오지 못했습니다.' }, { status: 500 });
  }
  return NextResponse.json({ data: aggregateWinbackDashboard(targets.data ?? [], variants.data ?? []) });
}
