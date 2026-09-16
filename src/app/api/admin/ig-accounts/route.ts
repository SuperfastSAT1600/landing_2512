import { NextResponse } from 'next/server';

const IG_ACCOUNTS = [
  { slug: 'official', envKey: 'IG_ID_OFFICIAL' },
  { slug: 'global',   envKey: 'IG_ID_GLOBAL' },
  { slug: 'brandon',  envKey: 'IG_ID_BRANDON' },
] as const;

const FIELDS = 'username,name,followers_count,follows_count,media_count';

export async function GET() {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'FACEBOOK_ACCESS_TOKEN 누락' }, { status: 500 });
  }

  const results = await Promise.all(
    IG_ACCOUNTS.map(async ({ slug, envKey }) => {
      const igId = process.env[envKey];
      if (!igId) return { slug, error: `${envKey} 누락` };

      const url = new URL(`https://graph.facebook.com/v21.0/${igId}`);
      url.searchParams.set('fields', FIELDS);
      url.searchParams.set('access_token', token);

      const res = await fetch(url.toString());
      if (!res.ok) return { slug, error: `API 오류 ${res.status}` };

      const data = await res.json() as {
        username: string;
        name: string;
        followers_count: number;
        follows_count: number;
        media_count: number;
      };

      return {
        slug,
        username: data.username,
        name: data.name,
        followers_count: data.followers_count,
        follows_count: data.follows_count,
        media_count: data.media_count,
      };
    })
  );

  return NextResponse.json({ data: results });
}
