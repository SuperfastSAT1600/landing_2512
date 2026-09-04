#!/usr/bin/env node
/**
 * Ghost 블로그 썸네일 생성기 (텍스트 기반, Playwright 렌더링)
 * Usage: node generate-ghost-thumbnail.js <slug> [<제목>]
 * - 제목 생략 시 content/posts/ 에서 자동 탐색
 * - Claude API가 제목을 썸네일용 2줄 텍스트로 자동 요약
 * Example: node generate-ghost-thumbnail.js sat-math-time-management
 *          node generate-ghost-thumbnail.js sat-math-time-management "SAT Math M2 시간 관리 전략"
 */

require('dotenv').config({ path: '.env.local' })
const { chromium } = require('playwright')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const https = require('https')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GHOST_URL = process.env.GHOST_URL
const [GHOST_KEY_ID, GHOST_SECRET] = (process.env.GHOST_ADMIN_KEY || ':').split(':')
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const [slug, titleArg] = process.argv.slice(2)

if (!slug) {
  console.error('Usage: node generate-ghost-thumbnail.js <slug> [<제목>]')
  process.exit(1)
}

function findTitleFromSlug(slug) {
  const contentDir = path.join(__dirname, 'content/posts')
  if (!fs.existsSync(contentDir)) return null
  const files = fs.readdirSync(contentDir).filter(f => f.includes(slug) && f.endsWith('.md'))
  if (!files.length) return null
  const raw = fs.readFileSync(path.join(contentDir, files[0]), 'utf8')
  const m = raw.match(/^title:\s*["']?(.+?)["']?\s*$/m)
  return m ? m[1].trim() : null
}

async function summarizeTitle(title) {
  const body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `다음 블로그 제목을 썸네일 이미지에 들어갈 임팩트 있는 2줄 텍스트로 요약해줘.
규칙: 각 줄 한글 12자 이내, 핵심 키워드 중심, 구어체 금지, 숫자/영어 활용 권장.
JSON만 반환 (다른 텍스트 없이): { "line1": "...", "line2": "..." }
제목: ${title}`
    }]
  })

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`Anthropic API ${res.statusCode}: ${data}`))
        const result = JSON.parse(data)
        const text = result.content?.[0]?.text || ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) return reject(new Error('JSON 파싱 실패: ' + text))
        resolve(JSON.parse(jsonMatch[0]))
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function getGhostToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: GHOST_KEY_ID, typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url')
  const sig = crypto.createHmac('sha256', Buffer.from(GHOST_SECRET, 'hex')).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

function ghostRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null
    const url = new URL(`${GHOST_URL}${path}`)
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Ghost ${getGhostToken()}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`Ghost API ${res.statusCode}: ${data}`))
        resolve(JSON.parse(data))
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

function buildHTML(line1, line2, logoBase64) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background: #071be9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .title {
      text-align: center;
      font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
      font-weight: 800;
      font-size: 90px;
      line-height: 1.1;
      letter-spacing: -0.06em;
      -webkit-text-stroke: 10px #000000;
      paint-order: stroke fill;
      padding: 0 100px;
      word-break: keep-all;
    }
    .line1 { color: #fcfd00; display: block; }
    .line2 { color: #ffffff; display: block; }
    .logo {
      position: absolute;
      bottom: 44px;
      left: 50%;
      transform: translateX(-50%);
      height: 40px;
    }
  </style>
</head>
<body>
  <div class="title">
    <span class="line1">${line1}</span>${line2 ? `<span class="line2">${line2}</span>` : ''}
  </div>
  ${logoBase64 ? `<img class="logo" src="data:image/png;base64,${logoBase64}" />` : ''}
</body>
</html>`
}

async function run() {
  const title = titleArg || findTitleFromSlug(slug)
  if (!title) {
    console.error(`❌ 제목을 찾을 수 없습니다. 인수로 직접 전달하거나 content/posts/ 에 파일이 있어야 합니다.`)
    process.exit(1)
  }
  console.log(`      제목: ${title}`)

  console.log('[0/3] Claude로 썸네일 텍스트 생성 중...')
  const { line1, line2 } = await summarizeTitle(title)
  console.log(`      줄1: ${line1}`)
  console.log(`      줄2: ${line2}`)

  console.log('[1/3] 썸네일 렌더링 중...')

  const logoPath = path.join(__dirname, 'public/white-logo.png')
  const logoBase64 = fs.existsSync(logoPath) ? fs.readFileSync(logoPath).toString('base64') : null
  if (logoBase64) console.log('      로고: public/white-logo.png')

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1200, height: 630 })
  await page.setContent(buildHTML(line1, line2, logoBase64), { waitUntil: 'networkidle' })

  // 폰트 로딩 대기
  await page.evaluate(() => document.fonts.ready)

  const localPath = `public/thumbnails/${slug}-ghost.png`
  await page.screenshot({ path: localPath, type: 'png' })
  await browser.close()

  console.log(`   로컬 저장: ${localPath}`)
  console.log('✅ 렌더링 완료')

  console.log('[2/3] Supabase 업로드 중...')
  const imageBuffer = fs.readFileSync(localPath)

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const uniqueSuffix = `${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
  const storagePath = `${year}/${month}/${uniqueSuffix}-${slug}-ghost-thumbnail.png`

  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(storagePath, imageBuffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    console.error('❌ 업로드 실패:', uploadError.message)
    process.exit(1)
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/uploads/${storagePath}`
  console.log(`✅ 업로드 완료: ${publicUrl}`)

  console.log(`[3/3] Ghost feature_image 업데이트 중: ${slug}`)
  let ghostPost
  try {
    const res = await ghostRequest('GET', `/ghost/api/admin/posts/slug/${slug}/?formats=html`)
    ghostPost = res.posts?.[0]
  } catch (e) {
    console.warn(`⚠️  Ghost 포스트 조회 실패 (slug: ${slug}): ${e.message}`)
    console.log(`   썸네일 URL (수동 설정용): ${publicUrl}`)
    return
  }

  if (!ghostPost) {
    console.warn(`⚠️  Ghost에 slug '${slug}' 포스트 없음`)
    console.log(`   썸네일 URL (수동 설정용): ${publicUrl}`)
    return
  }

  await ghostRequest('PUT', `/ghost/api/admin/posts/${ghostPost.id}/`, {
    posts: [{ feature_image: publicUrl, updated_at: ghostPost.updated_at }]
  })

  console.log('✅ 완료!')
  console.log(`   포스팅: ${ghostPost.title}`)
  console.log(`   썸네일: ${publicUrl}`)
}

run().catch(err => {
  console.error('오류:', err.message)
  process.exit(1)
})
