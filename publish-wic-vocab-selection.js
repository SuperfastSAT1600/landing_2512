require('dotenv').config({ path: '.env.local' })
const GhostAdminAPI = require('@tryghost/admin-api')
const https = require('https')
const { marked } = require('marked')
const fs = require('fs')

// ─── HTML 로더 ────────────────────────────────────────────────────────────────
// HTML 주석(<!-- ... -->)으로 시작하는 메타데이터 블록을 건너뛰고 본문만 추출합니다.
// ## 레퍼런스 · QA · 내부용 섹션은 발행에서 제외합니다.
function loadHtml(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const lines = raw.split('\n')

  // HTML 주석 블록 끝 찾기
  let startLine = 0
  if (lines[0].trim() === '<!--') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '-->') {
        startLine = i + 1
        break
      }
    }
  }

  // 레퍼런스/QA 섹션 이전까지만 본문 사용
  let endLine = lines.length
  for (let i = startLine; i < lines.length; i++) {
    if (/^## (레퍼런스|QA|내부용|\(내부용\)|Supabase)/.test(lines[i])) {
      endLine = i
      break
    }
  }

  return marked.parse(lines.slice(startLine, endLine).join('\n').trim())
}

// ─── Ghost ────────────────────────────────────────────────────────────────────
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

// ─── Landing (Supabase) ───────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

async function publishToLanding({ id, title, content, excerpt, description, featured_image, category, tags, author, date, focus_keyword }) {
  const body = JSON.stringify({
    id, title, content, excerpt, description,
    featured_image: featured_image || null,
    category, tags: tags || [], author: author || 'SuperfastSAT',
    date, focus_keyword: focus_keyword || null, cta_featured: false
  })

  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/posts`)
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer': 'return=representation'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log('✅ 랜딩 성공:', JSON.parse(data)[0]?.id)
          resolve()
        } else {
          console.error('❌ 랜딩 실패:', res.statusCode, data)
          reject(new Error(`Landing ${res.statusCode}: ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ─── 통합 발행 ────────────────────────────────────────────────────────────────
async function publishAll({ ghost, landing }) {
  console.log('🚀 발행 시작')
  console.log('  Ghost:', ghost.title)
  console.log('  랜딩:', landing.title)

  const [ghostResult, landingResult] = await Promise.allSettled([
    publishToGhost(ghost),
    publishToLanding(landing)
  ])

  if (ghostResult.status === 'rejected') console.error('Ghost 오류:', ghostResult.reason.message)
  if (landingResult.status === 'rejected') console.error('랜딩 오류:', landingResult.reason.message)

  const ghostOk = ghostResult.status === 'fulfilled'
  const landingOk = landingResult.status === 'fulfilled'
  console.log(`\n🎉 완료! Ghost: ${ghostOk ? '✅' : '❌'} | 랜딩: ${landingOk ? '✅' : '❌'}`)
}

// ─── 포스팅 내용 ──────────────────────────────────────────────────────────────
const ghostHtml = loadHtml('content/posts/2026-03-31-wic-vocab-selection-ghost.md')
const landingContent = loadHtml('content/posts/2026-03-31-wic-vocab-selection-landing.md')

publishAll({
  ghost: {
    slug: 'sat-words-in-context-vocabulary-selection-mechanism-tier-two',
    title: 'SAT Words in Context 단어 선정 기준: College Board 공식 문서 분석',
    html: ghostHtml,
    excerpt: 'WIC는 어렵거나 희귀한 단어를 출제하지 않습니다. College Board 공식 문서가 명시적으로 제외한 단어가 있고, 출제 단어 선정에는 세 가지 실증적 기준이 있습니다. 222개 문항 분석 데이터로 단어 암기 전략의 효과를 검증합니다.',
    metaTitle: 'SAT Words in Context 단어 선정 기준: College Board 공식 문서 분석',
    metaDescription: 'WIC 출제 단어는 대학 교과서 빈출 기준으로 선정됩니다. College Board가 명시적으로 제외한 희귀 단어 목록과 222개 문항 분석(동사 45%·선택지 고유도)으로 단어 암기 전략의 한계를 검증합니다.',
    tags: ['SAT', 'SAT RW', 'Words in Context', 'SAT 어휘', 'WIC'],
  },
  landing: {
    id: 'sat-wic-vocab-selection-2026-03-31',
    title: 'SAT WIC, 단어를 외워도 점수가 안 오르는 구조적 이유',
    content: landingContent,
    excerpt: '단어를 외워도 WIC 점수가 오르지 않는다면 방향이 틀렸을 가능성이 높습니다. College Board가 어떤 단어를 제외하는지, 실제 출제 문항 222개의 패턴이 무엇을 말하는지 확인하십시오.',
    description: 'WIC 출제 단어는 희귀 단어가 아닙니다. College Board가 명시한 3가지 선정 기준과 222개 문항 분석(동사 45%, 선택지 고유도)으로 단어 암기 전략이 왜 효과가 없는지 설명합니다.',
    featured_image: null,
    category: 'SAT RW',
    tags: ['WIC', 'Words in Context', 'SAT 어휘', '어휘 선정', 'Tier Two'],
    author: '배병윤',
    date: '2026-03-31',
    focus_keyword: 'SAT Words in Context 단어 공부법',
  },
})
