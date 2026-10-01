import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const CACHE_TTL_MINUTES = 60;

async function getCachedResult(username: string): Promise<boolean | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from('mission_follow_cache')
    .select('is_follower')
    .eq('instagram_username', username.toLowerCase())
    .gte('cached_at', cutoff)
    .order('cached_at', { ascending: false })
    .limit(1)
    .single();
  return data ? data.is_follower : null;
}

async function setCachedResult(username: string, isFollower: boolean) {
  await supabaseAdmin.from('mission_follow_cache').insert({
    instagram_username: username.toLowerCase(),
    is_follower: isFollower,
  });
}

async function checkFollowerViaInstagramAPI(username: string): Promise<boolean> {
  const accountId = process.env.INSTAGRAM_MISSION_ACCOUNT_ID ?? process.env.IG_ID_OFFICIAL!;
  const accessToken = process.env.INSTAGRAM_MISSION_ACCESS_TOKEN ?? process.env.FACEBOOK_ACCESS_TOKEN!;
  const normalizedUsername = username.replace(/^@/, '').toLowerCase();

  let url = `https://graph.facebook.com/v21.0/${accountId}/followers?fields=username&limit=100&access_token=${accessToken}`;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Instagram API error: ${res.status}`);
    const json = await res.json();

    const found = (json.data as { username: string }[]).some(
      (f) => f.username.toLowerCase() === normalizedUsername
    );
    if (found) return true;

    url = json.paging?.next ?? null;
  }

  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('username');

  if (!raw) {
    return NextResponse.json({ error: { code: 'MISSING_USERNAME', message: '인스타 아이디를 입력해주세요.' } }, { status: 400 });
  }

  const username = raw.replace(/^@/, '').toLowerCase();

  try {
    const cached = await getCachedResult(username);
    if (cached !== null) {
      return NextResponse.json({ data: { verified: cached, cached: true } });
    }

    const isFollower = await checkFollowerViaInstagramAPI(username);
    await setCachedResult(username, isFollower);

    return NextResponse.json({ data: { verified: isFollower, cached: false } });
  } catch (err) {
    console.error('[verify-follow]', err);
    return NextResponse.json({ error: { code: 'INSTAGRAM_API_ERROR', message: 'Instagram API 오류가 발생했습니다.' } }, { status: 500 });
  }
}
