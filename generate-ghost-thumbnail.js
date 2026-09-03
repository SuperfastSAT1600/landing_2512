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
const crypto = require('crypto')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const [slug, line1, line2] = process.argv.slice(2)

if (!slug || !line1) {
  console.error('Usage: node generate-ghost-thumbnail.js <slug> "<줄1>" "<줄2>"')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function buildHTML(line1, line2) {
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
      align-items: center;
      justify-content: center;
    }
    .title {
      text-align: center;
      font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
      font-weight: 800;
      font-size: 66px;
      color: #ffffff;
      line-height: 1.4;
      -webkit-text-stroke: 2.5px #000000;
      paint-order: stroke fill;
      padding: 0 100px;
      word-break: keep-all;
    }
  </style>
</head>
<body>
  <div class="title">${line1}${line2 ? `<br>${line2}` : ''}</div>
</body>
</html>`
}

async function run() {
  console.log('[1/3] 썸네일 렌더링 중...')
  console.log(`      줄1: ${line1}`)
  if (line2) console.log(`      줄2: ${line2}`)

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1200, height: 630 })
  await page.setContent(buildHTML(line1, line2), { waitUntil: 'networkidle' })

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

  console.log(`[3/3] featured_image 업데이트 중: ${slug}`)
  const { data, error: patchError } = await supabase
    .from('posts')
    .update({ featured_image: publicUrl })
    .eq('id', slug)
    .select('id, title')

  if (patchError) {
    console.error('❌ DB 업데이트 실패:', patchError.message)
    process.exit(1)
  }

  if (!data || !data.length) {
    console.warn(`⚠️  slug 없음: ${slug} (썸네일은 업로드됨)`)
    console.log(`   URL: ${publicUrl}`)
    return
  }

  console.log('✅ 완료!')
  console.log(`   포스팅: ${data[0].title}`)
  console.log(`   썸네일: ${publicUrl}`)
}

run().catch(err => {
  console.error('오류:', err.message)
  process.exit(1)
})
