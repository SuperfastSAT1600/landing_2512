#!/usr/bin/env node
/**
 * Ghost 블로그 썸네일 생성기 (텍스트 기반, Playwright 렌더링)
 * Usage: node generate-ghost-thumbnail.js <slug> "<줄1>" "<줄2>"
 * Example: node generate-ghost-thumbnail.js sat-math-m2-time-management "SAT Math M2 시간 관리" "고난도 5개를 두 번 검토할 시간을 만드는 법"
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

const [slug, line1, line2] = process.argv.slice(2)

if (!slug || !line1) {
  console.error('Usage: node generate-ghost-thumbnail.js <slug> "<줄1>" "<줄2>"')
  process.exit(1)
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
  console.log('[1/3] 썸네일 렌더링 중...')
  console.log(`      줄1: ${line1}`)
  if (line2) console.log(`      줄2: ${line2}`)

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
