require('dotenv').config({ path: '.env.local' })
const https = require('https')
const fs = require('fs')
const { marked } = require('marked')

const isDraft = !process.argv.includes('--publish')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

// Read and parse the landing markdown file
const raw = fs.readFileSync('content/posts/2026-06-09-june-2026-sat-exam-analysis-landing.md', 'utf8')
const withoutFrontmatter = raw.replace(/^---[sS]+?---
/, '')
const bodyOnly = withoutFrontmatter
  .replace(/## BlogPosting JSON-LD 스키마[sS]*?(?=
## |$)/, '')
  .replace(/## Supabase posts 필드 매핑[sS]*?(?=
## |$)/, '')
  .replace(/## 설득 스코어카드[sS]*$/, '')
  .trim()

const htmlContent = marked(bodyOnly)

function publishToLanding(data) {
  const body = JSON.stringify(data)
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + '/rest/v1/posts')
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Prefer': 'return=representation'
      }
    }, (res) => {
      let responseData = ''
      res.on('data', chunk => responseData += chunk)
      res.on('end', () => {
        if (res.statusCode === 201) {
          const post = JSON.parse(responseData)[0]
          console.log('랜딩 페이지 포스팅 성공!')
          console.log('제목:', post.title)
          console.log('ID:', post.id)
          resolve(post)
        } else {
          console.error('실패:', res.statusCode, responseData)
          reject(new Error(responseData))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

console.log('[Landing] 모드: ' + (isDraft ? 'draft (is_published=false)' : 'publish (is_published=true)'))

publishToLanding({
  id: 'june-2026-sat-exam-analysis',
  title: '2026년 6월 SAT 시험 분석: Reddit이 들끓은 이유, 섹션별로 짚어드립니다',
  content: htmlContent,
  excerpt: '"수학 시험 도중 헛웃음이 나왔다" — 6월 6일 SAT 직후 Reddit에 쏟아진 반응을 포함해, 이번 시험에서 점수를 가른 RW와 Math의 구조적 원인을 섹션별로 분석합니다.',
  description: '2026년 6월 SAT 분석. 버섯 지문·67 Riddles·삼각기둥 등 Reddit에서 가장 뜨거웠던 문항과 함께, RW 시간 붕괴 원인·Math Word Problem 독해력 이슈·고난도 어휘 총정리까지.',
  featured_image: null,
  category: 'SAT 시험 분석',
  tags: ['SAT 분석', '6월 SAT', 'Digital SAT', 'SAT RW', 'SAT Math', '2026 SAT', 'SAT 어휘', 'SAT Reddit'],
  author: '배병윤',
  date: '2026-06-09',
  focus_keyword: '2026년 6월 SAT 분석',
  is_published: !isDraft
}).catch(err => {
  console.error('발행 실패:', err.message)
  process.exit(1)
})
