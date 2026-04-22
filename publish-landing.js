require('dotenv').config({ path: '.env.local' })
const https = require('https')

// --draft (기본값) 또는 --publish
const isDraft = !process.argv.includes('--publish')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

async function publishToLanding({ id, title, content, excerpt, description, featured_image, category, tags, author, date, focus_keyword, is_published = true }) {
  const body = JSON.stringify({
    id,
    title,
    content,
    excerpt,
    description,
    featured_image,
    category,
    tags: tags || [],
    author: author || 'SuperfastSAT',
    date,
    focus_keyword: focus_keyword || null,
    cta_featured: false,
    is_published
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
          const post = JSON.parse(data)[0]
          console.log('✅ 랜딩 페이지 포스팅 성공!')
          console.log('제목:', post.title)
          console.log('ID:', post.id)
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

// 테스트 포스팅
publishToLanding({
  id: 'test-landing-post-001',
  title: '테스트 랜딩 포스팅',
  content: '<p>랜딩 페이지 자동 포스팅 테스트입니다.</p>',
  excerpt: '테스트 발췌문입니다.',
  description: '테스트 메타 설명입니다.',
  featured_image: null,
  category: '입시뉴스',
  tags: ['테스트'],
  author: 'SuperfastSAT',
  date: new Date().toISOString().split('T')[0],
  focus_keyword: null,
  is_published: !isDraft
})