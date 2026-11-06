// 퍼센트 변화 10문항 -> Supabase posts (랜딩 블로그, 내부 학생용)
// 항상 비공개(is_published=false)로 저장한다. 목록·sitemap에는 나오지 않고 /blog/{id} 직접 링크로만 열린다.
// 공개 플래그는 일부러 두지 않았다. 본문은 원고(md)와 문제 데이터에서 매번 새로 빌드한다.
//   node scripts/blog/publish-percent-change-10.js
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MD = path.join(__dirname, '../../content/posts/2026-11-06-percent-change-10-problems-landing.md');

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 없습니다');
  const { buildPost } = await import('./percent-change-lib.mjs');
  const post = buildPost(fs.readFileSync(MD, 'utf8'));
  console.log(`[Landing] 비공개 저장 (is_published=false) / id=${post.id} / ${post.content.length}자`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(post),
  });
  if (!res.ok) throw new Error(`저장 실패 ${res.status}: ${await res.text()}`);
  console.log(`저장 완료: /blog/${post.id}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
