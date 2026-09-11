import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/cron/fb-ad-spend-sync
 * Vercel Cron — runs daily at 02:00 KST (17:00 UTC)
 *
 * Facebook Ads API에서 최근 3일치 일별 spend를 두 광고 계정에서 조회하여
 * marketing_ad_spend 테이블에 upsert한다.
 * 3일 범위를 쓰는 이유: Facebook은 집계가 하루~이틀 지연될 수 있음.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  const accountIds = process.env.FACEBOOK_AD_ACCOUNT_IDS;

  if (!token || !accountIds) {
    return NextResponse.json(
      { error: 'FACEBOOK_ACCESS_TOKEN 또는 FACEBOOK_AD_ACCOUNT_IDS 환경변수 누락' },
      { status: 500 }
    );
  }

  const accounts = accountIds.split(',').map((s) => s.trim()).filter(Boolean);

  const today = new Date();
  const since = fmtDate(new Date(today.getTime() - 3 * 86400000));
  const until = fmtDate(today);

  const spendByDate: Record<string, number> = {};

  for (const accountId of accounts) {
    const url = new URL(`https://graph.facebook.com/v21.0/${accountId}/insights`);
    url.searchParams.set('fields', 'spend');
    url.searchParams.set('time_increment', '1');
    url.searchParams.set('time_range', JSON.stringify({ since, until }));
    url.searchParams.set('limit', '30');
    url.searchParams.set('access_token', token);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `Facebook API 오류 (${accountId}): ${body.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const json = await res.json() as { data?: { date_start: string; spend: string }[] };
    for (const row of json.data ?? []) {
      const amount = Math.round(parseFloat(row.spend || '0'));
      spendByDate[row.date_start] = (spendByDate[row.date_start] ?? 0) + amount;
    }
  }

  const rows = Object.entries(spendByDate)
    .filter(([, amount]) => amount > 0)
    .map(([date, amount]) => ({ date, channel_group: 'META', amount, note: 'fb_sync' }));

  if (rows.length === 0) {
    return NextResponse.json({ synced: 0, range: { since, until } });
  }

  const { error } = await supabaseAdmin
    .from('marketing_ad_spend')
    .upsert(rows, { onConflict: 'date,channel_group' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ synced: rows.length, range: { since, until }, dates: Object.keys(spendByDate) });
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
