import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/cron/ig-content-spend-sync
 * Vercel Cron — runs daily at 02:30 KST (17:30 UTC)
 *
 * 두 광고 계정에서 최근 3일치 광고별 spend를 수집하고
 * Instagram 포스트 shortcode와 함께 ig_content_ad_spend에 upsert한다.
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

  const rows: {
    date: string;
    ad_id: string;
    ad_name: string;
    post_shortcode: string | null;
    post_url: string | null;
    ad_account_id: string;
    spend: number;
    impressions: number;
    reach: number;
  }[] = [];

  for (const accountId of accounts) {
    // 1) insights: ad_id별 날짜별 spend
    const insightUrl = new URL(`https://graph.facebook.com/v21.0/${accountId}/insights`);
    insightUrl.searchParams.set('fields', 'ad_id,ad_name,spend,impressions,reach');
    insightUrl.searchParams.set('time_range', JSON.stringify({ since, until }));
    insightUrl.searchParams.set('time_increment', '1');
    insightUrl.searchParams.set('level', 'ad');
    insightUrl.searchParams.set('limit', '500');
    insightUrl.searchParams.set('access_token', token);

    const insightRes = await fetch(insightUrl.toString());
    if (!insightRes.ok) {
      const body = await insightRes.text();
      return NextResponse.json(
        { error: `Facebook Insights API 오류 (${accountId}): ${body.slice(0, 200)}` },
        { status: 502 }
      );
    }
    type InsightRow = { ad_id: string; ad_name: string; spend: string; impressions: string; reach: string; date_start: string };
    const insightData = await insightRes.json() as { data?: InsightRow[] };
    const spendMap = new Map<string, { date: string; ad_name: string; spend: number; impressions: number; reach: number }>();
    for (const row of insightData.data ?? []) {
      const spend = Math.round(parseFloat(row.spend || '0'));
      if (spend === 0) continue;
      spendMap.set(`${row.date_start}__${row.ad_id}`, {
        date: row.date_start,
        ad_name: row.ad_name,
        spend,
        impressions: parseInt(row.impressions || '0', 10),
        reach: parseInt(row.reach || '0', 10),
      });
    }

    if (spendMap.size === 0) continue;

    // 2) adcreatives: ad_id → instagram_permalink_url
    const adsUrl = new URL(`https://graph.facebook.com/v21.0/${accountId}/ads`);
    adsUrl.searchParams.set('fields', 'id,adcreatives{instagram_permalink_url}');
    adsUrl.searchParams.set('limit', '500');
    adsUrl.searchParams.set('access_token', token);

    const adsRes = await fetch(adsUrl.toString());
    if (!adsRes.ok) {
      const body = await adsRes.text();
      return NextResponse.json(
        { error: `Facebook Ads API 오류 (${accountId}): ${body.slice(0, 200)}` },
        { status: 502 }
      );
    }
    type AdRow = { id: string; adcreatives?: { data: { instagram_permalink_url?: string }[] } };
    const adsData = await adsRes.json() as { data?: AdRow[] };
    const permalinkMap = new Map<string, string>();
    for (const ad of adsData.data ?? []) {
      const creatives = ad.adcreatives?.data ?? [];
      const permalink = creatives[0]?.instagram_permalink_url ?? null;
      if (permalink) permalinkMap.set(ad.id, permalink);
    }

    // 3) 조합
    for (const [key, insight] of spendMap.entries()) {
      const adId = key.split('__')[1];
      const postUrl = permalinkMap.get(adId) ?? null;
      const shortcode = postUrl?.match(/\/p\/([^/]+)/)?.[1] ?? null;
      rows.push({
        date: insight.date,
        ad_id: adId,
        ad_name: insight.ad_name,
        post_shortcode: shortcode,
        post_url: postUrl,
        ad_account_id: accountId,
        spend: insight.spend,
        impressions: insight.impressions,
        reach: insight.reach,
      });
    }
  }

  if (rows.length === 0) {
    return NextResponse.json({ synced: 0, range: { since, until } });
  }

  const { error } = await supabaseAdmin
    .from('ig_content_ad_spend')
    .upsert(rows, { onConflict: 'date,ad_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ synced: rows.length, range: { since, until } });
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
