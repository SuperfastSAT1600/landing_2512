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
  console.log('✅ Ghost 새 포스팅 성공:', result.url)
  return result
}

// Ghost 기존 포스팅 업데이트 (slug로 조회 후 html 교체)
async function updateGhostPost(slug, appendHtml) {
  // slug로 포스트 조회
  const posts = await ghostApi.posts.browse({ filter: `slug:${slug}`, limit: 1, fields: 'id,slug,html,updated_at' })
  if (!posts || posts.length === 0) {
    console.error(`❌ Ghost 포스팅 없음: slug=${slug}`)
    return null
  }
  const post = posts[0]

  // 현재 html에서 끝맺음 섹션 직전에 링크 삽입
  // 끝맺음/마무리 h2 태그를 찾아서 그 앞에 삽입
  let currentHtml = post.html || ''

  // CTA 버튼 직전에 삽입 (CTA_HTML 또는 끝맺음 헤딩 앞)
  // 끝맺음 헤딩 패턴 탐색: <h2 ...>끝맺음 또는 마무리
  const endingPattern = /<h2[^>]*>끝맺음|<h2[^>]*>마무리/i
  const ctaPattern = /<div style="text-align:center;">/

  let insertBefore = null
  let matchPos = -1

  // 끝맺음 헤딩 먼저 시도
  const endMatch = endingPattern.exec(currentHtml)
  if (endMatch) {
    matchPos = endMatch.index
    insertBefore = 'heading'
  }

  // 없으면 CTA 버튼 직전 시도
  if (matchPos === -1) {
    const ctaMatch = ctaPattern.exec(currentHtml)
    if (ctaMatch) {
      matchPos = ctaMatch.index
      insertBefore = 'cta'
    }
  }

  let newHtml
  if (matchPos !== -1) {
    newHtml = currentHtml.slice(0, matchPos) + appendHtml + '\n' + currentHtml.slice(matchPos)
  } else {
    // 맨 끝에 추가
    newHtml = currentHtml + '\n' + appendHtml
  }

  const updated = await ghostApi.posts.edit({
    id: post.id,
    html: newHtml,
    updated_at: post.updated_at
  }, { source: 'html' })

  console.log(`✅ Ghost 포스팅 업데이트 성공: ${updated.url} (삽입 위치: ${insertBefore || '맨 끝'})`)
  return updated
}

// ─── Landing (Supabase) ───────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

async function publishToLanding({ id, title, content, excerpt, description, featured_image, category, tags, author, date, focus_keyword, is_published = true }) {
  const body = JSON.stringify({
    id, title, content, excerpt, description, featured_image,
    category, tags: tags || [], author: author || 'SuperfastSAT',
    date, focus_keyword: focus_keyword || null, cta_featured: false, is_published
  })
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/posts`)
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
        'Prefer': 'return=representation'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 201) {
          const post = JSON.parse(data)[0]
          console.log('✅ 랜딩 새 포스팅 성공! ID:', post.id)
          resolve(post)
        } else {
          console.error('❌ 랜딩 실패:', res.statusCode, data)
          reject(new Error(data))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// Landing 기존 포스팅 업데이트 (id로 조회 후 content 교체)
async function updateLandingPost(id, appendHtml) {
  // 현재 content 조회
  const getBody = await new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}&select=id,content`)
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(data))
        else reject(new Error(`GET 실패: ${res.statusCode} ${data}`))
      })
    })
    req.on('error', reject)
    req.end()
  })

  if (!getBody || getBody.length === 0) {
    console.error(`❌ 랜딩 포스팅 없음: id=${id}`)
    return null
  }

  const currentContent = getBody[0].content || ''

  // FAQ 섹션 또는 끝맺음 헤딩 직전에 삽입
  const endingPattern = /<h2[^>]*>끝맺음|<h2[^>]*>마무리|<h2[^>]*>자주 묻는|<h2[^>]*>FAQ/i
  const endMatch = endingPattern.exec(currentContent)

  let newContent
  if (endMatch) {
    newContent = currentContent.slice(0, endMatch.index) + appendHtml + '\n' + currentContent.slice(endMatch.index)
  } else {
    newContent = currentContent + '\n' + appendHtml
  }

  const updateBody = JSON.stringify({ content: newContent })

  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}`)
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(updateBody),
        'Prefer': 'return=representation'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          const post = JSON.parse(data)[0]
          console.log(`✅ 랜딩 포스팅 업데이트 성공: id=${post.id}`)
          resolve(post)
        } else {
          console.error('❌ 랜딩 업데이트 실패:', res.statusCode, data)
          reject(new Error(data))
        }
      })
    })
    req.on('error', reject)
    req.write(updateBody)
    req.end()
  })
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
    if (/^## (레퍼런스|참고 자료|Supabase|내부용|\(내부용\))/.test(lines[i])) {
      endLine = i; break
    }
  }

  return marked.parse(lines.slice(startLine, endLine).join('\n').trim())
}

// ─── 실행 ────────────────────────────────────────
async function main() {
  const ghostStatus = isDraft ? 'draft' : 'published'
  const isPublished = !isDraft
  console.log(`\n🚀 CIA 오답 설계 포스팅 발행 [${isDraft ? 'DRAFT' : 'PUBLISH'}]\n`)

  const ghostHtml = loadHtml('/workspace/content/posts/2026-05-13-sat-rw-cia-wrong-answer-design-ghost.md')
  const landingContent = loadHtml('/workspace/content/posts/2026-05-13-sat-rw-cia-wrong-answer-design-landing.md')

  // ── 1. 새 포스팅 발행 ──
  console.log('─── STEP 1: 새 포스팅 발행 ───')

  const [ghostNew, landingNew] = await Promise.allSettled([
    publishToGhost({
      slug: 'sat-rw-cia-wrong-answer-design',
      title: 'SAT CIA 오답 설계 — College Board가 만드는 5가지 함정 유형',
      html: ghostHtml,
      excerpt: 'SAT CIA 오답 280개 전수 분석. Out of Scope 57.5%, Contradiction 16.4% — 상위 2개가 73.9%. College Board 오답 설계 패턴을 데이터로 분석합니다.',
      metaTitle: 'SAT CIA 오답 설계 — College Board가 만드는 5가지 함정 유형',
      metaDescription: 'SAT Central Ideas and Details 오답 280개 전수 분析. Out of Scope 57.5%, Contradiction 16.4% — CB가 설계하는 5가지 오답 유형을 데이터로 분석합니다.',
      tags: ['SAT', 'Central Ideas', '오답분析', 'CIA', 'Reading and Writing'],
      status: ghostStatus,
    }),
    publishToLanding({
      id: 'sat-rw-cia-wrong-answer-design',
      title: 'SAT RW Central Ideas and Details — College Board 오답 설계 5가지 유형',
      content: landingContent,
      excerpt: 'College Board는 CIA 오답을 5가지 유형으로 설계합니다. Out of Scope 57.5%, Contradiction 16.4% — 상위 2개가 전체 오답의 73.9%를 차지합니다.',
      description: 'College Board CIA 오답 280개 전수 分析. Out of Scope 57.5%, Contradiction 16.4% — 상위 2개가 73.9%. 각 유형의 설계 특징과 Hard 함정 패턴을 데이터로 정리.',
      featured_image: null,
      category: 'SAT RW',
      tags: ['SAT', 'Central Ideas', '오답분析', 'CIA', '오답설계', 'Reading and Writing'],
      author: '배병윤',
      date: '2026-05-13',
      focus_keyword: 'SAT Central Ideas 오답',
      is_published: isPublished,
    })
  ])

  let ghostNewUrl = null
  if (ghostNew.status === 'fulfilled') {
    ghostNewUrl = ghostNew.value.url
  } else {
    console.error('Ghost 새 포스팅 오류:', ghostNew.reason.message)
  }

  if (landingNew.status === 'rejected') {
    console.error('랜딩 새 포스팅 오류:', landingNew.reason.message)
  }

  // ── 2. 기존 포스팅에 링크 추가 ──
  console.log('\n─── STEP 2: 기존 포스팅 링크 추가 ───')

  const ghostLinkHtml = `<p>이 포스팅에서 나온 오답 유형(Out of Scope, Contradiction 등)을 더 깊이 분석한 후속 포스팅이 있습니다.</p>
<p>→ <a href="https://blog.superfastsat.com/sat-rw-cia-wrong-answer-design/">College Board CIA 오답 설계 5가지 유형 심화 분析</a></p>`

  const landingLinkHtml = `<p>이 포스팅에서 나온 오답 유형(Out of Scope, Contradiction 등)을 더 깊이 분析한 후속 포스팅이 있습니다.</p>
<p>→ <a href="https://superfastsat.com/blog/sat-rw-cia-wrong-answer-design">College Board CIA 오답 설계 5가지 유형 심화 分析</a></p>`

  const [ghostUpdate, landingUpdate] = await Promise.allSettled([
    updateGhostPost('sat-rw-central-ideas-details-subtypes', ghostLinkHtml),
    updateLandingPost('sat-rw-central-ideas-details-7-types', landingLinkHtml)
  ])

  if (ghostUpdate.status === 'rejected') {
    console.error('Ghost 업데이트 오류:', ghostUpdate.reason.message)
  }
  if (landingUpdate.status === 'rejected') {
    console.error('랜딩 업데이트 오류:', landingUpdate.reason.message)
  }

  // ── 결과 요약 ──
  console.log('\n════════════════════════════════')
  console.log('발행 결과 요약')
  console.log('════════════════════════════════')

  const ghostNewStatus = ghostNew.status === 'fulfilled' ? `✅ ${ghostNew.value.url}` : `❌ ${ghostNew.reason.message}`
  const landingNewStatus = landingNew.status === 'fulfilled' ? `✅ https://superfastsat.com/blog/sat-rw-cia-wrong-answer-design` : `❌ ${landingNew.reason.message}`
  const ghostUpdateStatus = ghostUpdate.status === 'fulfilled' ? `✅ ${ghostUpdate.value?.url}` : `❌ ${ghostUpdate.reason?.message}`
  const landingUpdateStatus = landingUpdate.status === 'fulfilled' ? `✅ sat-rw-central-ideas-details-7-types 업데이트 완료` : `❌ ${landingUpdate.reason?.message}`

  console.log('[새 포스팅]')
  console.log('  Ghost  :', ghostNewStatus)
  console.log('  랜딩   :', landingNewStatus)
  console.log('[기존 포스팅 업데이트]')
  console.log('  Ghost  :', ghostUpdateStatus)
  console.log('  랜딩   :', landingUpdateStatus)
  console.log('════════════════════════════════\n')
}

main().catch(err => {
  console.error('치명적 오류:', err)
  process.exit(1)
})
