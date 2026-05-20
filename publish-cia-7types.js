require('dotenv').config({ path: '.env.local' })
const GhostAdminAPI = require('@tryghost/admin-api')
const https = require('https')
const marked = require('marked')
const fs = require('fs')

// --draft (기본값) 또는 --publish
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
        if (res.statusCode === 201) { console.log('✅ 랜딩 성공:', JSON.parse(data)[0].id); resolve(JSON.parse(data)[0]) }
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
  return { ghostResult, landingResult }
}

// ─── 본문 로드 ────────────────────────────────────
function loadHtml(filePath) {
  const md = fs.readFileSync(filePath, 'utf8')
  const lines = md.split('\n')
  let separatorCount = 0
  let startLine = 0
  let endLine = lines.length

  // 두 번째 --- 이후부터 본문 시작
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      separatorCount++
      if (separatorCount === 2) { startLine = i + 1; break }
    }
  }

  // 레퍼런스·Supabase 매핑·QA 섹션 이전까지만 본문
  for (let i = startLine; i < lines.length; i++) {
    if (/^## (레퍼런스|참고 자료|Supabase|내부용|\(내부용\))/.test(lines[i])) {
      endLine = i; break
    }
  }

  return marked.parse(lines.slice(startLine, endLine).join('\n').trim())
}

const ghostHtml = loadHtml('/workspace/content/posts/2026-05-13-sat-rw-central-ideas-details-7-types-ghost.md')
const landingContent = loadHtml('/workspace/content/posts/2026-05-13-sat-rw-central-ideas-details-7-types-landing.md')

publishAll({
  ghost: {
    slug: 'sat-rw-central-ideas-details-subtypes',
    title: 'SAT RW Central Ideas and Details — College Board가 측정하는 7가지 독해 유형',
    html: ghostHtml,
    excerpt: 'College Board는 Central Ideas and Details 하나의 스킬 이름 아래 7가지 다른 독해 능력을 측정합니다. CIA 112문제 전수 분석으로 오답 57.5%가 Out of Scope에서 발생하는 구조적 이유를 정리합니다.',
    metaTitle: 'SAT RW Central Ideas and Details — College Board가 측정하는 7가지 독해 유형',
    metaDescription: 'College Board SAT Central Ideas and Details 문제에서 오답 57.5%가 Out of Scope인 이유. CIA-1~CIA-7 7가지 세부 유형을 분석합니다.',
    tags: ['SAT', 'Reading and Writing', 'Central Ideas', 'CIA', '독해'],
  },
  landing: {
    id: 'sat-rw-central-ideas-details-7-types',
    title: 'SAT RW Central Ideas and Details — College Board가 실제로 측정하는 7가지 독해 유형',
    content: landingContent,
    excerpt: 'College Board는 Central Ideas and Details 하나의 스킬 이름 아래 7가지 다른 독해 능력을 측정합니다. 오답 57.5%가 Out of Scope인 이유와 CIA-1~CIA-7 각 유형의 특성을 분석합니다.',
    description: 'SAT CIA 112문제 전수 분석. Hard 비율 32.1%, 오답 57.5%가 Out of Scope인 이유. CIA-1~CIA-7 각 유형 특성과 출제 패턴 데이터로 정리.',
    featured_image: null,
    category: 'SAT RW',
    tags: ['SAT', 'Reading and Writing', 'Central Ideas', 'CIA', '독해', '세부유형'],
    author: '배병윤',
    date: '2026-05-13',
    focus_keyword: 'SAT Central Ideas and Details',
  },
})
