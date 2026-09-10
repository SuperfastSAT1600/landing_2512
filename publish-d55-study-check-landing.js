require('dotenv').config({ path: '.env.local' })
const https = require('https')
const fs = require('fs')
const { marked } = require('marked')

const isDraft = !process.argv.includes('--publish')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

const raw = fs.readFileSync('content/posts/2026-06-26-d55-study-check-landing.md', 'utf8')

const withoutFrontmatter = raw.replace(/^---[\s\S]+?---\n/, '')

const bodyOnly = withoutFrontmatter
  .replace(/## BlogPosting JSON-LD 스키마[\s\S]*?(?=\n## |$)/, '')
  .replace(/## Supabase posts 테이블 필드 매핑[\s\S]*?(?=\n## |$)/, '')
  .replace(/## 레퍼런스[\s\S]*$/, '')
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
  id: 'sat-august-d55-study-check',
  title: 'SAT 8월 시험 D-55, 지금 공부가 실전 기준에 맞는지 점검해야 합니다',
  content: htmlContent,
  excerpt: '3주째 모의고사를 풀고 오답도 복습했는데 점수가 움직이지 않는다면, 공부량이 아니라 방향의 문제입니다. Digital SAT adaptive 구조에 맞는 5가지 점검 질문과 55일 전환 방법을 정리했습니다.',
  description: '공부는 하는데 점수가 안 오른다면, Digital SAT adaptive 구조와 맞지 않는 훈련을 하고 있을 가능성이 높습니다. 5가지 점검 질문과 55일 전환 방법을 확인해보세요.',
  featured_image: null,
  category: 'SAT 공부법',
  tags: ['Digital SAT', 'SAT 8월', 'SAT 공부법', 'SAT 점수 향상', 'SAT adaptive', 'SAT 모의고사', 'SAT 준비'],
  author: '배병윤',
  date: '2026-06-26',
  focus_keyword: 'SAT 8월 시험 준비',
  is_published: !isDraft
}).catch(err => {
  console.error('발행 실패:', err.message)
  process.exit(1)
})
