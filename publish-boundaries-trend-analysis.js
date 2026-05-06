require('dotenv').config({ path: '.env.local' })
const GhostAdminAPI = require('@tryghost/admin-api')
const https = require('https')
const marked = require('marked')
const fs = require('fs')

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

// ─── 본문 로드 ────────────────────────────────────
function loadHtml(filePath) {
  const md = fs.readFileSync(filePath, 'utf8')
  const lines = md.split('\n')
  let separatorCount = 0
  let startLine = 0
  let endLine = lines.length

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      separatorCount++
      if (separatorCount === 2) { startLine = i + 1; break }
    }
  }

  for (let i = startLine; i < lines.length; i++) {
    if (/^## (레퍼런스|Supabase|내부용|\(내부용\))/.test(lines[i])) {
      endLine = i; break
    }
  }

  return marked.parse(lines.slice(startLine, endLine).join('\n').trim())
}

const ghostHtml = loadHtml('content/posts/2026-04-14-boundaries-choice-design-ghost.md')
const landingContent = loadHtml('content/posts/2026-04-14-boundaries-choice-design-landing.md')

publishAll({
  ghost: {
    slug: 'sat-boundaries-trend-analysis',
    title: 'SAT Boundaries 출제 경향 완전 분석 — 169문제 전수 집계',
    html: ghostHtml,
    excerpt: 'Boundaries 169문제를 전수 집계하면 구두점 선택의 이유가 보입니다. 쉼표가 가장 많이 나오지만, 콜론이 보이면 그 문제는 Hard입니다. 출제 경향 데이터와 오답 보기 설계 패턴을 정리했습니다.',
    metaTitle: 'SAT Boundaries 출제 경향 분석 — 169문제 전수 집계 데이터',
    metaDescription: 'College Board Question Bank Boundaries 169문제 전수 집계. 쉼표·세미콜론·콜론·대시별 난이도 분포, 오답 함정 패턴, Easy와 Hard의 출제 원리 차이를 데이터로 분석합니다.',
    tags: ['SAT', 'SAT문법', 'Boundaries', '구두점', '세미콜론', '콜론', '디지털SAT'],
  },
  landing: {
    id: 'sat-boundaries-trend-analysis',
    title: 'SAT Boundaries 출제 경향 완전 분석 — 169문제 전수 집계',
    content: landingContent,
    excerpt: 'Boundaries 169문제를 전수 집계하면 구두점 선택의 이유가 보입니다. 쉼표가 가장 많이 나오지만, 콜론이 보이면 그 문제는 Hard입니다. 출제 경향 데이터와 오답 보기 설계 패턴을 정리했습니다.',
    description: 'College Board Question Bank Boundaries 169문제 전수 집계. 쉼표·세미콜론·콜론·대시별 난이도 분포, 오답 함정 패턴, Easy와 Hard의 출제 원리 차이를 데이터로 분석합니다.',
    featured_image: null,
    category: 'RW 전략',
    tags: ['SAT', 'SAT문법', 'Boundaries', '구두점', '세미콜론', '콜론', '디지털SAT'],
    author: '배병윤',
    date: '2026-04-14',
    focus_keyword: 'SAT Boundaries 출제 경향',
  },
})
