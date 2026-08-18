require('dotenv').config({ path: '.env.local' })
const crypto = require('crypto')
const https = require('https')
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const { marked } = require('marked')

// --draft (기본값) 또는 --publish
const isDraft = !process.argv.includes('--publish')

// 발행할 파일 경로 (커맨드라인 인자 또는 기본값)
const fileArg = process.argv.find(a => a.endsWith('.md'))
if (!fileArg) {
  console.error('사용법: node publish-ghost-post.js <파일경로.md> [--draft|--publish]')
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

const CTA_HTML = `
<div style="text-align:center;margin-top:40px;">
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
          console.log('Ghost 포스팅 성공!')
          console.log('제목:', post.title)
          console.log('URL:', post.url)
          console.log('상태:', post.status)
          resolve(post)
        } else {
          console.error('실패:', res.statusCode, data)
          reject(new Error(data))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// 마크다운 파일 파싱
const raw = fs.readFileSync(filePath, 'utf8')
const parsed = matter(raw)
const frontmatter = parsed.data
let markdownBody = parsed.content

// (내부용) QA 체크 섹션 제거 (Ghost에 노출되지 않도록)
markdownBody = markdownBody.replace(/---\s*\n## \(내부용\) QA 체크[\s\S]*$/m, '')

// HTML 변환
const html = marked(markdownBody)

const postData = {
  title: frontmatter.title,
  html,
  excerpt: frontmatter.excerpt,
  slug: frontmatter.slug,
  metaTitle: frontmatter.metaTitle || frontmatter.title,
  metaDescription: frontmatter.metaDescription || frontmatter.meta_description,
  tags: frontmatter.tags || []
}

console.log(`[Ghost] 모드: ${isDraft ? 'draft' : 'published'}`)
console.log('[Ghost] 발행 대상:', postData.title)
console.log('[Ghost] Slug:', postData.slug)

publishToGhost(postData).catch(err => {
  console.error('발행 중 오류:', err.message)
  process.exit(1)
})
