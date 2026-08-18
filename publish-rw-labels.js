require('dotenv').config({ path: '.env.local' })
const GhostAdminAPI = require('@tryghost/admin-api')
const https = require('https')
const { marked } = require('marked')
const fs = require('fs')

// ─── CLI 플래그 ───────────────────────────────────
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

// ─── 마크다운 → HTML 변환 ─────────────────────────
function loadHtml(filePath) {
  const md = fs.readFileSync(filePath, 'utf8')
  const lines = md.split('\n')
  let separatorCount = 0
  let startLine = 0
  let endLine = lines.length

  // 두 번째 --- 이후부터 본문 시작 (frontmatter 건너뜀)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      separatorCount++
      if (separatorCount === 2) { startLine = i + 1; break }
    }
  }

  // 레퍼런스·Supabase 매핑·QA 섹션 이전까지만 본문
  for (let i = startLine; i < lines.length; i++) {
    if (/^## (레퍼런스|Supabase|\(내부용\))/.test(lines[i])) {
      endLine = i; break
    }
  }

  return marked.parse(lines.slice(startLine, endLine).join('\n').trim())
}

// ─── 통합 실행 ────────────────────────────────────
async function publishAll({ ghost, landing }) {
  const ghostStatus = isDraft ? 'draft' : 'published'
  const isPublished = !isDraft
  console.log(`\n포스팅 시작 [${isDraft ? 'DRAFT' : 'PUBLISH'}]`)
  console.log('  Ghost용:', ghost.title)
  console.log('  랜딩용:', landing.title)
  const [ghostResult, landingResult] = await Promise.allSettled([
    publishToGhost({ ...ghost, status: ghostStatus }),
    publishToLanding({ ...landing, is_published: isPublished })
  ])
  if (ghostResult.status === 'rejected') console.error('Ghost 오류:', ghostResult.reason.message)
  if (landingResult.status === 'rejected') console.error('랜딩 오류:', landingResult.reason.message)
  console.log('\n완료!')
}

// ─── 포스팅 내용 ──────────────────────────────────
const ghostHtml = loadHtml('content/posts/2026-05-05-rw-labels-ghost.md')
const landingContent = loadHtml('content/posts/2026-05-05-rw-labels-landing.md')

publishAll({
  ghost: {
    slug: 'sat-rw-passage-label-system',
    title: 'SAT RW 지문 구조 완전 분석 — College Board가 설계한 15가지 기능 라벨',
    html: ghostHtml,
    excerpt: 'SAT RW 지문 1,609문제 전수 분석 결과, 상위 4개 라벨이 전체 문장의 57.2%를 차지합니다. College Board의 지문 설계 원리와 15가지 기능 라벨 분포 데이터를 전수 공개합니다.',
    metaTitle: 'SAT RW 지문 구조 완전 분석 — College Board가 설계한 15가지 기능 라벨',
    metaDescription: 'SAT RW 지문 1,609문제 전수 분석 결과, 상위 4개 라벨이 전체의 57.2%를 차지합니다. College Board의 지문 설계 원리와 15가지 기능 라벨 전수 공개.',
    tags: ['SAT', 'SAT RW', '지문 분석', '디지털SAT', 'SAT 커리큘럼'],
  },
  landing: {
    id: 'sat-rw-passage-label-system',
    title: 'SAT RW 지문 구조 완전 분석 — College Board가 설계한 15가지 기능 라벨',
    content: landingContent,
    excerpt: 'SAT RW 지문 1,609문제 전수 분석. 상위 4개 라벨이 57.2%를 차지합니다.',
    description: 'SAT RW 지문 1,609문제 전수 분석 결과, 상위 4개 라벨이 전체의 57.2%를 차지합니다. College Board의 지문 설계 원리와 15가지 기능 라벨 전수 공개.',
    featured_image: null,
    category: 'SAT RW',
    tags: ['SAT', 'SAT RW', '지문 분석', '디지털SAT'],
    author: '배병윤',
    date: '2026-05-05',
    focus_keyword: 'SAT RW 지문 구조',
  },
})
