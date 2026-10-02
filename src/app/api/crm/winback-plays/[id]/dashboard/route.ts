import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { aggregateWinbackDashboard } from '@/lib/winback/dashboard';
import { apiError, unauthorized } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(request)) return unauthorized();
  const { id } = await params;
  const [play, targets, variants] = await Promise.all([
    supabaseAdmin.from('winback_plays').select('id').eq('id', id).single(),
    supabaseAdmin.from('winback_targets').select('status,variant_id,sent_at,response,reconnected_at,converted_at,conversion_amount').eq('play_id', id),
    supabaseAdmin.from('winback_play_variants').select('id,name').eq('play_id', id).order('sort_order'),
  ]);
  if (play.error || !play.data) return apiError('NOT_FOUND', '플레이를 찾을 수 없습니다.', 404);
  if (targets.error || variants.error) {
    console.error('[winback-plays/[id]/dashboard]', targets.error ?? variants.error);
    return apiError('INTERNAL_ERROR', '성과를 불러오지 못했습니다.', 500);
  }
  return NextResponse.json({ data: aggregateWinbackDashboard(targets.data ?? [], variants.data ?? []) });
}
