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
  console.log('Ghost 성공:', result.url)
  return result
}

// ─── Landing ─────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

async function publishToLanding({ id, title, content, excerpt, description, featured_image, category, tags, author, date, focus_keyword }) {
  const body = JSON.stringify({
    id, title, content, excerpt, description, featured_image,
    category, tags: tags || [], author: author || 'SuperfastSAT',
    date, focus_keyword: focus_keyword || null, cta_featured: false
  })
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/posts`)
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
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
          console.log('랜딩 성공:', JSON.parse(data)[0].id)
          resolve()
        } else {
          console.error('랜딩 실패:', res.statusCode, data)
          reject(new Error(data))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ─── 마크다운 로더 ────────────────────────────────
function loadHtml(filePath) {
  const md = fs.readFileSync(filePath, 'utf8')
  const lines = md.split('\n')
  let separatorCount = 0
  let startLine = 0
  let endLine = lines.length

  // frontmatter(---) 끝난 직후부터 본문 시작
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

// ─── 포스팅 내용 ──────────────────────────────────
const ghostHtml = loadHtml('content/posts/2026-04-05-sat-transitions-analysis-cb-trap-design-ghost.md')
const landingContent = loadHtml('content/posts/2026-04-05-sat-transitions-analysis-hard-trap-learning-path-landing.md')

async function publishAll() {
  console.log('포스팅 시작')
  console.log('  Ghost용: SAT Transitions 분석 — CB가 Easy와 Hard에서 다른 단어를 쓰는 이유')
  console.log('  랜딩용: SAT Transitions 완전 분석 — 연결어 암기가 Hard 점수를 깎는 구조')

  const [ghostResult, landingResult] = await Promise.allSettled([
    publishToGhost({
      slug: 'sat-transitions-analysis-cb-trap-design',
      title: 'SAT Transitions 분석 — CB가 Easy와 Hard에서 다른 단어를 쓰는 이유',
      html: ghostHtml,
      excerpt: 'SAT Transitions에서 연결어를 외웠는데도 Hard 문제를 틀린다면, 이 데이터를 보시면 이유가 분명해집니다. 161개 실제 문제 분석 결과, Easy 정답 1위 단어(However, As a result)가 Hard 오답 자리에 정확히 배치됩니다. CB의 함정 설계 구조를 흐름별로 분해했습니다.',
      metaTitle: 'SAT Transitions 분석 — CB가 Easy와 Hard에서 다른 단어를 쓰는 이유',
      metaDescription: 'SAT Transitions 161개 실제 문제 분석. Contrast가 Hard에서 가장 많이 나오는 이유, Easy 정답 단어가 Hard 오답이 되는 구조, CB의 Distractor Pull 패턴을 데이터로 확인합니다.',
      tags: ['SAT', 'Transitions', 'RW전략', '연결어', '디지털SAT'],
    }),
    publishToLanding({
      id: 'sat-transitions-analysis-hard-trap-learning-path',
      title: 'SAT Transitions 완전 분석 — 연결어 암기가 Hard 점수를 깎는 구조',
      content: landingContent,
      excerpt: 'SAT Transitions에서 연결어를 외울수록 Hard에서 더 많이 틀리는 이유가 있습니다. CB 161개 실제 문제 데이터가 그 구조를 정확히 보여줍니다. 단어가 아니라 두 문장 사이의 관계를 먼저 읽는 순서로 바꾸는 것, 그것이 Hard 정답률을 바꿉니다.',
      description: 'SAT Transitions 161개 실제 문제 데이터 분석. Easy 정답 단어(However, As a result)가 Hard 오답 자리에 배치되는 CB의 설계 구조를 데이터로 분석하고, 3단계 학습 경로를 제시합니다.',
      featured_image: null,
      category: 'RW 전략',
      tags: ['SAT', 'Transitions', 'RW전략', '연결어', '디지털SAT'],
      author: '배병윤',
      date: '2026-04-05',
      focus_keyword: 'SAT Transitions 분석',
    }),
  ])

  if (ghostResult.status === 'rejected') console.error('Ghost 오류:', ghostResult.reason.message)
  if (landingResult.status === 'rejected') console.error('랜딩 오류:', landingResult.reason.message)
  console.log('\n완료!')
}

publishAll()
