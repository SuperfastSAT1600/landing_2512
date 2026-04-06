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
    href="https://open.kakao.com/o/s858Ajch"
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
    카카오톡으로 즉시 상담받기🖐️
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

const ghostHtml = loadHtml('content/posts/2026-03-25-sat-tutoring-comparison-ghost.md');
const landingContent = loadHtml('content/posts/2026-03-25-sat-tutoring-comparison-landing.md');

publishAll({
  ghost: {
    slug: "sat-tutoring-hagwon-online-self-study-comparison",
    title: "SAT 과외 vs 학원 vs 인강 vs 독학: 방식별 원리와 선택 기준",
    html: ghostHtml,
    excerpt: "SAT 준비 방식을 고를 때 가장 많이 하는 실수는 비용과 편의로 결정하는 것입니다. 과외·학원·인강·독학은 각각 다른 전제 조건을 요구하며, 충족되지 않으면 효과가 없습니다. 점수대와 자기조절 능력을 기준으로 맞는 방식을 고르는 법을 정리합니다.",
    metaTitle: "SAT 과외 vs 학원 vs 인강 vs 독학 완전 비교 | 방식별 원리와 선택 기준",
    metaDescription: "SAT 준비 방식 선택에서 가장 중요한 것은 비용이 아닙니다. 점수대·자기조절 능력·남은 시간—이 세 기준으로 과외·학원·인강·독학 중 맞는 방식을 고르는 법을 정리합니다.",
    tags: ["SAT", "SAT 학습 전략", "SAT 과외", "SAT 학원", "SAT 인강"],
  },
  landing: {
    id: "sat-tutoring-hagwon-online-self-study",
    title: "SAT 과외 vs 학원 vs 인강 vs 독학: 방식보다 먼저 봐야 하는 것",
    content: landingContent,
    excerpt: "SAT 준비 방식을 고르기 전에 먼저 확인해야 할 것이 있습니다. 점수대, 혼자 앉아 있는 힘, 남은 시간—이 세 가지가 과외·학원·인강·독학 중 맞는 방식을 결정합니다.",
    description: "SAT 준비 방식 선택에서 가장 중요한 것은 비용이 아닙니다. 점수대·자기조절 능력·남은 시간—이 세 기준으로 맞는 방식을 고르는 법을 정리합니다.",
    featured_image: null,
    category: "학습 전략",
    tags: ["SAT 과외", "SAT 학원", "SAT 인강", "SAT 독학", "SAT 준비 방법"],
    author: "배병윤",
    date: "2026-03-25",
    focus_keyword: "SAT 과외 학원 인강 독학 비교",
  },
})