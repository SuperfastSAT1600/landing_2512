import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const IG_ACCOUNTS = [
  { slug: 'official', envKey: 'IG_ID_OFFICIAL' },
  { slug: 'global',   envKey: 'IG_ID_GLOBAL' },
  { slug: 'brandon',  envKey: 'IG_ID_BRANDON' },
] as const;

type IgSlug = 'official' | 'global' | 'brandon' | 'unknown';

async function buildShortcodeMap(token: string): Promise<Map<string, IgSlug>> {
  const map = new Map<string, IgSlug>();
  await Promise.all(
    IG_ACCOUNTS.map(async ({ slug, envKey }) => {
      const igId = process.env[envKey];
      if (!igId) return;
      const url = new URL(`https://graph.facebook.com/v21.0/${igId}/media`);
      url.searchParams.set('fields', 'shortcode');
      url.searchParams.set('limit', '100');
      url.searchParams.set('access_token', token);
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = await res.json() as { data?: { shortcode: string }[] };
      for (const m of data.data ?? []) {
        map.set(m.shortcode, slug);
      }
    })
  );
  return map;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to   = searchParams.get('to')   ?? new Date().toISOString().slice(0, 10);

  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'FACEBOOK_ACCESS_TOKEN 누락' }, { status: 500 });
  }

  const { data: rows, error } = await supabaseAdmin
    .from('ig_content_ad_spend')
    .select('post_shortcode, post_url, ad_id, spend, impressions, reach')
    .gte('date', from)
    .lte('date', to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const shortcodeMap = await buildShortcodeMap(token);

  type Agg = { post_url: string | null; ig_account: IgSlug; total_spend: number; total_impressions: number; total_reach: number; ad_ids: Set<string> };
  const aggMap = new Map<string, Agg>();

  for (const row of rows ?? []) {
    const key = row.post_shortcode ?? row.post_url ?? 'unknown';
    if (!aggMap.has(key)) {
      aggMap.set(key, {
        post_url: row.post_url,
        ig_account: row.post_shortcode ? (shortcodeMap.get(row.post_shortcode) ?? 'unknown') : 'unknown',
        total_spend: 0,
        total_impressions: 0,
        total_reach: 0,
        ad_ids: new Set(),
      });
    }
    const agg = aggMap.get(key)!;
    agg.total_spend += row.spend ?? 0;
    agg.total_impressions += row.impressions ?? 0;
    agg.total_reach += row.reach ?? 0;
    if (row.ad_id) agg.ad_ids.add(row.ad_id);
  }

  const result = Array.from(aggMap.entries())
    .map(([post_shortcode, agg]) => ({
      post_shortcode: post_shortcode === 'unknown' ? null : post_shortcode,
      post_url: agg.post_url,
      ig_account: agg.ig_account,
      total_spend: agg.total_spend,
      total_impressions: agg.total_impressions,
      total_reach: agg.total_reach,
      ad_count: agg.ad_ids.size,
    }))
    .sort((a, b) => b.total_spend - a.total_spend);

  return NextResponse.json({ data: result, range: { from, to } });
}
