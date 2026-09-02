require('dotenv').config({ path: '.env.local' })
const https = require('https')
const fs = require('fs')
const { marked } = require('marked')

const isDraft = !process.argv.includes('--publish')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

// 원고 파일 파싱
const raw = fs.readFileSync(
  '/workspace/content/posts/2026-08-31-columbia-sat-required-all-ivy-landing.md',
  'utf8'
)

// frontmatter / body 분리
const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/)
if (!fmMatch) {
  console.error('frontmatter를 찾을 수 없습니다.')
  process.exit(1)
}

const fmRaw = fmMatch[1]
const bodyRaw = fmMatch[2]

// YAML 간단 파싱 (필요한 필드만)
function getYaml(key) {
  const m = fmRaw.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'))
  return m ? m[1].trim() : null
}
function getYamlArray(key) {
  const m = fmRaw.match(new RegExp(`^${key}:\\s*\\[([^\\]]+)\\]`, 'm'))
  if (!m) return []
  return m[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
}

const title = getYaml('title')
const slug = getYaml('slug')
const focusKeyword = getYaml('focus_keyword')
const category = getYaml('category')
const tags = getYamlArray('tags')
const author = getYaml('author') || 'SuperfastSAT'
const date = getYaml('date')

// Supabase 주석에서 excerpt / description 추출
const excerptMatch = bodyRaw.match(/excerpt:\s*"([^"]+)"/)
const descriptionMatch = bodyRaw.match(/description:\s*"([^"]+)"/)
const excerpt = excerptMatch ? excerptMatch[1] : ''
const description = descriptionMatch ? descriptionMatch[1] : ''

// 본문 정제: _meta 블록 이하 제거
let body = bodyRaw
  .split('\n_meta:')[0]
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .trim()

// 마크다운 → HTML
const content = marked.parse(body)

async function publishToLanding(post) {
  const body = JSON.stringify({
    id: post.id,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    description: post.description,
    featured_image: post.featured_image || null,
    category: post.category,
    tags: post.tags || [],
    author: post.author,
    date: post.date,
    focus_keyword: post.focus_keyword || null,
    cta_featured: false,
    is_published: post.is_published
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
        'Prefer': 'resolution=merge-duplicates,return=representation'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const post = JSON.parse(data)[0]
          console.log('✅ 랜딩 페이지 포스팅 성공!')
          console.log('제목:', post.title)
          console.log('ID (slug):', post.id)
          console.log('is_published:', post.is_published)
          console.log('URL: https://superfastsat.com/blog/' + post.id)
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

console.log(`[Landing] 모드: ${isDraft ? 'draft (is_published=false)' : 'publish (is_published=true)'}`)
console.log('[Landing] 원고:', title)
console.log('[Landing] slug:', slug)

publishToLanding({
  id: slug,
  title,
  content,
  excerpt,
  description,
  featured_image: null,
  category,
  tags,
  author,
  date,
  focus_keyword: focusKeyword,
  is_published: !isDraft
}).catch(err => {
  console.error('[Landing] 발행 실패:', err.message)
  process.exit(1)
})
