import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = supabaseAdmin.from('marketing_ad_spend').select('*').order('date', { ascending: true });
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  const { data, error } = await query;
  if (error) {
    return apiError('FETCH_FAILED', error.message, 500);
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  const body = await request.json();
  const { date, channel_group, amount, note } = body;

  if (!date || !channel_group || amount == null) {
    return apiError('MISSING_PARAMS', 'date, channel_group, amount는 필수입니다.', 400);
  }

  if (!['META', '구글 SEO'].includes(channel_group)) {
    return apiError('INVALID_CHANNEL', "channel_group은 'META' 또는 '구글 SEO'여야 합니다.", 400);
  }

  if (typeof amount !== 'number' || amount < 0 || !Number.isInteger(amount)) {
    return apiError('INVALID_AMOUNT', 'amount는 0 이상의 정수(원 단위)여야 합니다.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('marketing_ad_spend')
    .upsert(
      { date, channel_group, amount, note: note ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'date,channel_group' }
    )
    .select()
    .single();

  if (error) {
    return apiError('UPSERT_FAILED', error.message, 500);
  }

  return NextResponse.json({ data });
}
