require('dotenv').config({ path: '.env.local' })
const GhostAdminAPI = require('@tryghost/admin-api')
const https = require('https')

// ─── CLI 플래그 ───────────────────────────────────
// --draft  : Ghost draft 저장 + Landing is_published=false (기본값)
// --publish: Ghost published + Landing is_published=true
const isDraft = !process.argv.includes('--publish')

// ─── Ghost ───────────────────────────────────────
const ghostApi = new GhostAdminAPI({
  url: process.env.GHOST_URL,
  key: process.env.GHOST_ADMIN_KEY,
  version: 'v5.0'
})

const CTA_HTML = `
<div style="text-align:center;">
  <a
    id="kakao-openchat-btn"
    href="https://superfastsat.com/api/kakao-redirect?source=ghost"
    target="_blank"
    rel="noopener noreferrer"
    style="
      display:inline-block;
      padding:14px 22px;
      border-radius:10px;
      background:#071be9;
      color:#ffffff;
      font-weight:600;
      text-decoration:none;
    "
  >
    카카오톡으로 수업 상담 신청하기🖐️
  </a>
</div>
`

async function publishToGhost({ title, html, excerpt, slug, metaTitle, metaDescription, tags, status = 'draft' }) {
  const result = await ghostApi.posts.add({
    title,
    html: html + CTA_HTML,
    custom_excerpt: excerpt,
    slug,
    meta_title: metaTitle,
    meta_description: metaDescription,
    tags: tags.map(t => ({ name: t })),
    status
  }, { source: 'html' })
  console.log('✅ Ghost 성공:', result.url)
  return result
}

// ─── Landing ─────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

async function publishToLanding({ id, title, content, excerpt, description, featured_image, category, tags, author, date, focus_keyword, is_published = true }) {
  const body = JSON.stringify({ id, title, content, excerpt, description, featured_image, category, tags: tags || [], author: author || 'SuperfastSAT', date, focus_keyword: focus_keyword || null, cta_featured: false, is_published })
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/posts`)
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Prefer': 'return=representation' }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 201) { console.log('✅ 랜딩 성공:', JSON.parse(data)[0].id); resolve() }
        else { console.error('❌ 랜딩 실패:', res.statusCode, data); reject(new Error(data)) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ─── 통합 실행 ────────────────────────────────────
async function publishAll({ ghost, landing }) {
  const ghostStatus = isDraft ? 'draft' : 'published'
  const isPublished = !isDraft
  console.log(`🚀 포스팅 시작 [${isDraft ? 'DRAFT' : 'PUBLISH'}]`)
  console.log('  Ghost용:', ghost.title)
  console.log('  랜딩용:', landing.title)
  const [ghostResult, landingResult] = await Promise.allSettled([
    publishToGhost({ ...ghost, status: ghostStatus }),
    publishToLanding({ ...landing, is_published: isPublished })
  ])
  if (ghostResult.status === 'rejected') console.error('Ghost 오류:', ghostResult.reason.message)
  if (landingResult.status === 'rejected') console.error('랜딩 오류:', landingResult.reason.message)
  console.log('\n🎉 완료!')
}

// ─── 포스팅 내용 ──────────────────────────────────
const marked = require('marked');
const fs = require('fs');

function loadHtml(path) {
  const md = fs.readFileSync(path, 'utf8');
  const lines = md.split('\n');
  let separatorCount = 0;
  let startLine = 0;
  let endLine = lines.length;

  // 두 번째 --- 이후부터 본문 시작
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      separatorCount++;
      if (separatorCount === 2) { startLine = i + 1; break; }
    }
  }

  // 레퍼런스·Supabase 매핑·QA 섹션 이전까지만 본문
  for (let i = startLine; i < lines.length; i++) {
    if (/^## (레퍼런스|Supabase|내부용|\(내부용\))/.test(lines[i])) {
      endLine = i; break;
    }
  }

  return marked.parse(lines.slice(startLine, endLine).join('\n').trim());
}

const ghostHtml = loadHtml('content/posts/2026-05-01-sat-may-vocab-491-ghost.md');
const landingContent = loadHtml('content/posts/2026-05-01-sat-may-vocab-491-landing.md');

publishAll({
  ghost: {
    slug: "sat-may-2026-vocab-491",
    title: "5월 SAT 직전 확인 단어 491개 — 4중 근거로 선정한 리스트",
    html: ghostHtml,
    excerpt: "College Board 최신 98개 문제와 1,527개 전체 분석으로 검증된 491개 단어입니다. 5중 필터를 통과한 이 목록에서 89개 보기 출현 단어부터 점검하십시오.",
    metaTitle: "5월 SAT 직전 확인 단어 491개 — 4중 근거로 선정한 리스트",
    metaDescription: "College Board 최신 98개 문제 + 1,527개 전체 분석으로 검증된 491개 단어. 5월 SAT 직전, 이 단어들 뜻 정확히 아는지 확인하세요.",
    tags: ["SAT", "SAT단어", "SAT어휘", "5월SAT"],
  },
  landing: {
    id: "sat-may-2026-vocab-491",
    title: "5월 SAT 직전 확인 단어 491개",
    content: landingContent,
    excerpt: "College Board가 2026년 4월 공개한 98개 최신 RW 문제에 등장하면서 5중 근거를 통과한 단어 491개입니다. 89개 보기 출현 단어부터 점검하십시오.",
    description: "College Board 최신 98개 문제 + 1,527개 전체 분석으로 검증된 491개 단어. 5월 SAT 직전, 이 단어들 뜻 정확히 아는지 확인하세요.",
    featured_image: null,
    category: "SAT RW",
    tags: ["SAT단어", "5월SAT", "SAT어휘"],
    author: "배병윤",
    date: "2026-05-01",
    focus_keyword: "SAT 단어",
  },
})
