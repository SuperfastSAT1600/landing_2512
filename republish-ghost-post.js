#!/usr/bin/env node
/**
 * Ghost 포스트 재발행 (기존 삭제 후 재생성)
 * PUT이 ?source=html을 지원하지 않아 DELETE + POST로 처리
 * Usage: node republish-ghost-post.js <파일경로.md> [feature_image_url]
 */
require('dotenv').config({ path: '.env.local' })
const crypto = require('crypto')
const https = require('https')
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const { marked } = require('marked')

const fileArg = process.argv.find(a => a.endsWith('.md'))
const featureImageArg = process.argv.find(a => a.startsWith('http'))

if (!fileArg) {
  console.error('사용법: node republish-ghost-post.js <파일경로.md> [feature_image_url]')
  process.exit(1)
}

const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(__dirname, fileArg)
if (!fs.existsSync(filePath)) {
  console.error('파일을 찾을 수 없습니다:', filePath)
  process.exit(1)
}

const [id, secret] = process.env.GHOST_ADMIN_KEY.split(':')

function getToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: id, typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url')
  const signature = crypto.createHmac('sha256', Buffer.from(secret, 'hex')).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

function ghostRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null
    const url = new URL(`${process.env.GHOST_URL}${urlPath}`)
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Ghost ${getToken()}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`Ghost ${method} ${urlPath} → ${res.statusCode}: ${data}`))
        resolve(data ? JSON.parse(data) : null)
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

const CTA_HTML = `
<div style="text-align:center;margin-top:40px;">
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

async function run() {
  const raw = fs.readFileSync(filePath, 'utf8')
  const parsed = matter(raw)
  const fm = parsed.data
  let markdownBody = parsed.content
  markdownBody = markdownBody.replace(/---\s*\n## \(내부용\) QA 체크[\s\S]*$/m, '')
  const html = marked(markdownBody)

  const slug = fm.slug
  console.log(`[Ghost] 재발행 대상: ${fm.title}`)
  console.log(`[Ghost] Slug: ${slug}`)

  // 1. 기존 포스트 조회
  let existingPost = null
  try {
    const res = await ghostRequest('GET', `/ghost/api/admin/posts/slug/${slug}/?formats=html`)
    existingPost = res.posts?.[0]
  } catch (e) {
    console.warn(`⚠️  기존 포스트 없음 (slug: ${slug}) — 새로 생성합니다`)
  }

  // 2. 기존 포스트 삭제
  if (existingPost) {
    console.log(`[1/2] 기존 포스트 삭제 중... (id: ${existingPost.id})`)
    await ghostRequest('DELETE', `/ghost/api/admin/posts/${existingPost.id}/`)
    console.log('✅ 삭제 완료')
  }

  // 3. 새 포스트 생성
  const featureImage = featureImageArg || existingPost?.feature_image || null
  console.log(`[2/2] 새 포스트 생성 중...`)
  if (featureImage) console.log(`     썸네일: ${featureImage}`)

  const postBody = {
    posts: [{
      title: fm.title,
      html: html + CTA_HTML,
      custom_excerpt: fm.excerpt,
      slug,
      meta_title: fm.metaTitle || fm.title,
      meta_description: fm.metaDescription || fm.meta_description,
      tags: (fm.tags || []).map(t => ({ name: t })),
      status: 'published',
      ...(featureImage ? { feature_image: featureImage } : {}),
    }]
  }

  const result = await ghostRequest('POST', '/ghost/api/admin/posts/?source=html', postBody)
  const post = result.posts[0]

  console.log('✅ 발행 완료!')
  console.log('   제목:', post.title)
  console.log('   URL:', post.url)
  console.log('   상태:', post.status)
}

run().catch(err => {
  console.error('오류:', err.message)
  process.exit(1)
})
