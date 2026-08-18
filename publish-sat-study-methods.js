require('dotenv').config({ path: '.env.local' })
const GhostAdminAPI = require('@tryghost/admin-api')
const https = require('https')
const marked = require('marked')
const fs = require('fs')

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

async function publishToGhost({ title, html, excerpt, slug, metaTitle, metaDescription, tags }) {
  const result = await ghostApi.posts.add({
    title,
    html: html + CTA_HTML,
    custom_excerpt: excerpt,
    slug,
    meta_title: metaTitle,
    meta_description: metaDescription,
    tags: tags.map(t => ({ name: t })),
    status: 'draft'
  }, { source: 'html' })
  console.log('✅ Ghost 성공:', result.url)
  return result
}

// ─── Landing ─────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

async function publishToLanding({ id, title, content, excerpt, description, featured_image, category, tags, author, date, focus_keyword }) {
  const body = JSON.stringify({ id, title, content, excerpt, description, featured_image, category, tags: tags || [], author: author || 'SuperfastSAT', date, focus_keyword: focus_keyword || null, cta_featured: false })
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
  console.log('🚀 포스팅 시작')
  console.log('  Ghost용:', ghost.title)
  console.log('  랜딩용:', landing.title)
  const [ghostResult, landingResult] = await Promise.allSettled([
    publishToGhost(ghost),
    publishToLanding(landing)
  ])
  if (ghostResult.status === 'rejected') console.error('Ghost 오류:', ghostResult.reason.message)
  if (landingResult.status === 'rejected') console.error('랜딩 오류:', landingResult.reason.message)
  console.log('\n🎉 완료!')
}

// ─── 포스팅 내용 ──────────────────────────────────
function loadHtml(path) {
  const md = fs.readFileSync(path, 'utf8').replace(/<!--[\s\S]*?-->\n\n/, '')
  return marked.parse(md)
}

const ghostHtml = loadHtml('content/posts/2026-03-24-sat-study-method-comparison-ghost.md')
const landingContent = loadHtml('content/posts/2026-03-24-sat-study-method-comparison-landing.md')

publishAll({
  ghost: {
    slug: 'sat-tutoring-academy-online-self-study-comparison',
    title: 'SAT 과외·학원·인강·독학 완전 비교 — 우리 아이에게 맞는 방식은?',
    html: ghostHtml,
    excerpt: 'SAT 준비 방식에는 정답이 없습니다. 핵심은 과외·학원·인강 중 무엇을 고르느냐가 아니라, 학생이 지금 어디에 있느냐입니다. 점수대별 추천 방식과 학습 효과의 원리를 정리했습니다.',
    metaTitle: 'SAT 과외·학원·인강·독학 완전 비교 — 우리 아이에게 맞는 방식은?',
    metaDescription: 'SAT 준비 방식을 고민 중이신가요? 과외·학원·인강·독학의 핵심 차이를 교육학 원리로 설명합니다. 점수대별 추천 방식과 학습 효과를 높이는 체크리스트까지 담았습니다.',
    tags: ['SAT', '학습 전략', '과외', '학원', '인강', '독학'],
  },
  landing: {
    id: 'sat-study-method-comparison-2026-03-24',
    title: 'SAT 과외 vs 학원 vs 인강 vs 독학: 우리 아이에게 맞는 선택은?',
    content: landingContent,
    excerpt: 'SAT 준비 방식에는 정답이 없습니다. 핵심은 방식이 아니라 학생이 지금 어디에 있느냐입니다. 점수대별 추천 방식과 학습 효과의 원리를 정리했습니다.',
    description: 'SAT 과외·학원·인강·독학 중 어떤 방식이 맞는지 점수대와 학습 독립성 기준으로 정리했습니다. 방식이 아니라 학생이 지금 어디에 있느냐가 핵심입니다.',
    featured_image: null,
    category: '학습 전략',
    tags: ['SAT', '과외', '학원', '인강', '독학', '학습 방식', '자기조절학습'],
    author: '배병윤',
    date: '2026-03-24',
    focus_keyword: 'SAT 과외 학원 인강 독학 비교',
  },
})
