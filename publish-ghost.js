require('dotenv').config({ path: '.env.local' })
const crypto = require('crypto')
const https = require('https')

// --draft (기본값) 또는 --publish
const isDraft = !process.argv.includes('--publish')

const [id, secret] = process.env.GHOST_ADMIN_KEY.split(':')

function getToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', kid: id, typ: 'JWT' })).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url')
  const signature = crypto.createHmac('sha256', Buffer.from(secret, 'hex')).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

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

async function publishToGhost({ title, html, excerpt, slug, metaTitle, metaDescription, tags }) {
  const token = getToken()
  const status = isDraft ? 'draft' : 'published'
  const body = JSON.stringify({
    posts: [{
      title,
      html: html + CTA_HTML,
      custom_excerpt: excerpt,
      slug,
      meta_title: metaTitle,
      meta_description: metaDescription,
      tags: tags.map(t => ({ name: t })),
      status
    }]
  })

  return new Promise((resolve, reject) => {
    const url = new URL(`${process.env.GHOST_URL}/ghost/api/admin/posts/`)
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Ghost ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 201) {
          const post = JSON.parse(data).posts[0]
          console.log('✅ Ghost 포스팅 성공!')
          console.log('제목:', post.title)
          console.log('URL:', post.url)
          resolve(post)
        } else {
          console.error('❌ 실패:', res.statusCode, data)
          reject(new Error(data))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

console.log(`[Ghost] 모드: ${isDraft ? 'draft' : 'published'}`)

// 테스트 포스팅
publishToGhost({
  title: '테스트 포스팅',
  html: '<p>Ghost 자동 포스팅 테스트입니다.</p>',
  excerpt: '테스트 발췌문',
  slug: 'test-posting-001',
  metaTitle: '테스트 포스팅',
  metaDescription: '테스트 설명',
  tags: ['SAT', '테스트']
})