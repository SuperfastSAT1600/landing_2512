import crypto from 'crypto';

const GHOST_BASE_URL = process.env.GHOST_URL || 'https://superfastsat.ghost.io';

const CTA_HTML = `<div style="text-align:center;margin-top:32px;">
  <a href="https://superfastsat.com/api/kakao-redirect?source=ghost" target="_blank" rel="noopener noreferrer"
    style="display:inline-block;padding:14px 22px;border-radius:10px;background:#071be9;color:#ffffff;font-weight:600;text-decoration:none;">
    카카오톡으로 수업 상담 신청하기🖐️
  </a>
</div>`;

export function titleToSlug(title: string): string {
  return title.toLowerCase().replace(/[^\w\s가-힣]/g, '').trim()
    .replace(/\s+/g, '-').slice(0, 60) + '-' + Date.now().toString(36);
}

function makeGhostJwt(): string {
  const key = process.env.GHOST_ADMIN_KEY!;
  const [ghostId, ghostSecret] = key.split(':');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: ghostId, typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url');
  const sig = crypto.createHmac('sha256', Buffer.from(ghostSecret, 'hex')).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export async function saveGhostDraft(
  title: string, html: string, slug: string
): Promise<{ id: string; url: string }> {
  const jwt = makeGhostJwt();
  const res = await fetch(`${GHOST_BASE_URL}/ghost/api/admin/posts/?source=html`, {
    method: 'POST',
    headers: { Authorization: `Ghost ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      posts: [{ title, html: html + CTA_HTML, slug, status: 'draft', tags: [{ name: 'SAT' }, { name: 'blog-agent' }] }],
    }),
  });
  const data = await res.json() as { posts?: { id: string; url: string }[] };
  if (!data.posts?.[0]) throw new Error(`Ghost draft 실패: ${JSON.stringify(data)}`);
  return { id: data.posts[0].id, url: data.posts[0].url };
}

export async function publishGhostPost(ghostId: string): Promise<string> {
  const jwt = makeGhostJwt();
  const getRes = await fetch(`${GHOST_BASE_URL}/ghost/api/admin/posts/${ghostId}/`, {
    headers: { Authorization: `Ghost ${jwt}` },
  });
  const getData = await getRes.json() as { posts?: { updated_at: string }[] };
  const updatedAt = getData.posts?.[0]?.updated_at;

  const putRes = await fetch(`${GHOST_BASE_URL}/ghost/api/admin/posts/${ghostId}/`, {
    method: 'PUT',
    headers: { Authorization: `Ghost ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts: [{ status: 'published', updated_at: updatedAt }] }),
  });
  const putData = await putRes.json() as { posts?: { url: string }[] };
  return putData.posts?.[0]?.url ?? `${GHOST_BASE_URL}/ghost/#/editor/post/${ghostId}`;
}
