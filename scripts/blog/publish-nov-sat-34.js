// 11월 SAT 반복 출제 유형 34문항 -> Supabase posts (랜딩 블로그)
// 본문은 원고(md)와 아티팩트 사본에서 매번 새로 빌드한다(별도 빌드 단계 없음).
// 기본은 draft(is_published=false). 공개는 --publish 를 명시했을 때만.
//   node scripts/blog/publish-nov-sat-34.js             # draft 저장 (이미 공개된 글이면 중단)
//   node scripts/blog/publish-nov-sat-34.js --publish   # 공개 저장(이미 공개된 글의 내용 갱신 포함)
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ID = '2026-11-04-nov-sat-recurring-34-problems';
const MD = path.join(__dirname, '../../content/posts/2026-11-04-nov-sat-recurring-34-problems-landing.md');
const SOURCE = path.join(__dirname, '../../content/posts/data/nov-sat-artifact-source.html');
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function isAlreadyPublished() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${ID}&select=is_published`, { headers });
  if (!res.ok) throw new Error(`조회 실패 ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  return rows.length > 0 && rows[0].is_published === true;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 없습니다');
  const { buildPostHtml, extractProblems, parsePublishArgs } = await import('./nov-sat-lib.mjs');
  const { isDraft } = parsePublishArgs(process.argv.slice(2));
  if (isDraft && (await isAlreadyPublished())) {
    throw new Error('이미 공개된 글입니다. draft로 덮어쓰면 비공개로 바뀌므로 중단합니다. 내용을 갱신하려면 --publish 를 쓰세요.');
  }
  const content = buildPostHtml(fs.readFileSync(MD, 'utf8'), extractProblems(fs.readFileSync(SOURCE, 'utf8')));
  const post = {
    id: ID,
    title: '11월 SAT 전에 풀어 볼 반복 출제 유형 34문항 — 숫자만 바뀌어 돌아온 문제들',
    content,
    excerpt: '2023년 3월부터 2026년 10월까지 SAT를 비교하니 글자가 같은 문제는 드물었고, 같은 뼈대에 숫자·이름·소재만 바꾼 문제가 반복됐습니다. Math 15문항, RW 19문항을 핵심 이론과 함정까지 정리했습니다.',
    description: '2023년 3월~2026년 10월 SAT를 비교한 결과, 반복된 것은 문제가 아니라 뼈대였습니다. Math 15문항, RW 19문항을 핵심 이론과 함정까지 정리했습니다.',
    featured_image: 'https://ualucbrrfvysmfytkdew.supabase.co/storage/v1/object/public/uploads/2026/11/1793776809145-3ed49a47-2026-11-04-nov-sat-recurring-34-problems-thumbnail.png',
    category: 'SAT학습팁',
    tags: ['SAT', '11월 SAT', 'SAT 기출 문제', 'SAT Math', 'SAT RW'],
    author: '배병윤',
    date: '2026-11-04',
    focus_keyword: 'SAT 반복 출제 유형',
    cta_featured: false,
    is_published: !isDraft,
  };
  console.log(`[Landing] 모드: ${isDraft ? 'draft (is_published=false)' : 'publish (is_published=true)'} / id=${ID} / ${content.length}자`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?on_conflict=id`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(post),
  });
  if (!res.ok) throw new Error(`저장 실패 ${res.status}: ${await res.text()}`);
  console.log('저장 완료');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
