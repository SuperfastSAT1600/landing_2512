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

// ─── 마크다운 → HTML 변환 ─────────────────────────
function loadHtml(filePath) {
  const md = fs.readFileSync(filePath, 'utf8')
  const lines = md.split('\n')
  let separatorCount = 0
  let startLine = 0
  let endLine = lines.length

  // frontmatter 끝(두 번째 ---) 이후부터 본문 시작
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      separatorCount++
      if (separatorCount === 2) { startLine = i + 1; break }
    }
  }

  // 레퍼런스·Supabase 매핑·QA 섹션 이전까지만 본문
  for (let i = startLine; i < lines.length; i++) {
    if (/^## (레퍼런스|Supabase|내부용|\(내부용\))/.test(lines[i])) {
      endLine = i; break
    }
  }

  return marked.parse(lines.slice(startLine, endLine).join('\n').trim())
}

// ─── 통합 실행 ────────────────────────────────────
async function publishAll({ ghost, landing }) {
  const ghostStatus = isDraft ? 'draft' : 'published'
  const isPublished = !isDraft
  console.log(`\n🚀 포스팅 시작 [${isDraft ? 'DRAFT' : 'PUBLISH'}]`)
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
const ghostHtml = loadHtml('content/posts/2026-04-21-sat-schedule-2026-2027-ghost.md')
const landingContent = loadHtml('content/posts/2026-04-21-sat-schedule-2026-2027-landing.md')

publishAll({
  ghost: {
    slug: 'sat-schedule-2026-2027',
    title: 'SAT 시험 일정 2026 하반기·2027 완전 정리 — 날짜·등록 마감일 한눈에',
    html: ghostHtml,
    excerpt: '2026 하반기 SAT는 6월~12월 총 6회, 2027년은 3월·5월·6월 3개 날짜가 현재 공개되어 있습니다. 한국 응시자 late registration 불가 주의사항과 상황별 날짜 선택 기준을 College Board 공식 일정으로 정리했습니다.',
    metaTitle: 'SAT 시험 일정 2026 하반기·2027 완전 정리 | 날짜·등록 마감일 한눈에',
    metaDescription: '2026 하반기 SAT 날짜(6월~12월) 6회와 2027년 현재 공개된 3개 날짜를 한 테이블로 정리했습니다. 한국 응시자의 late registration 불가 주의사항, 상황별 날짜 선택 기준 포함. College Board 공식 출처 기준.',
    tags: ['SAT', 'SAT 시험 준비', 'SAT 일정', 'SAT 시험 날짜', '2026 SAT', '2027 SAT', 'SAT 등록 마감일', '한국 SAT'],
  },
  landing: {
    id: 'sat-schedule-2026-2027',
    title: 'SAT 시험 일정 2026 하반기·2027 완전 정리 — 날짜·등록 마감일 한눈에',
    content: landingContent,
    excerpt: '2026 하반기 SAT는 6월~12월 총 6회, 2027년은 3월·5월·6월 3개 날짜가 현재 공개되어 있습니다. 한국 응시자 late registration 불가, 상황별 날짜 선택 기준까지 College Board 공식 일정으로 정리했습니다.',
    description: '2026 하반기 SAT 날짜(6월~12월) 6회와 2027년 현재 공개된 3개 날짜를 한 테이블로 정리했습니다. 한국 응시자의 late registration 불가 주의사항, 상황별 날짜 선택 기준 포함. College Board 공식 출처 기준.',
    featured_image: null,
    category: 'SAT 시험 준비',
    tags: ['SAT 일정', 'SAT 시험 날짜', '2026 SAT', '2027 SAT', 'SAT 등록 마감일', '한국 SAT'],
    author: '배병윤',
    date: '2026-04-21',
    focus_keyword: 'SAT 시험 일정 2026',
  },
})
