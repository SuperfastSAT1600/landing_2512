require('dotenv').config({ path: '.env.local' })
const https = require('https')
const fs = require('fs')
const { marked } = require('marked')

// --draft (기본값) 또는 --publish
const isDraft = !process.argv.includes('--publish')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

async function publishToLanding(post) {
  const body = JSON.stringify(post)

  return new Promise((resolve, reject) => {
    const checkUrl = new URL(`${SUPABASE_URL}/rest/v1/posts?id=eq.${post.id}`)
    const checkReq = https.request({
      hostname: checkUrl.hostname,
      path: checkUrl.pathname + checkUrl.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const existing = JSON.parse(data)
        if (existing.length > 0) {
          // PATCH (업데이트)
          const patchUrl = new URL(`${SUPABASE_URL}/rest/v1/posts?id=eq.${post.id}`)
          const patchReq = https.request({
            hostname: patchUrl.hostname,
            path: patchUrl.pathname + patchUrl.search,
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
              'Prefer': 'return=representation'
            }
          }, (pRes) => {
            let pData = ''
            pRes.on('data', chunk => pData += chunk)
            pRes.on('end', () => {
              if (pRes.statusCode === 200) {
                console.log('랜딩 업데이트 성공:', post.id)
                resolve(JSON.parse(pData))
              } else {
                console.error('랜딩 업데이트 실패:', pRes.statusCode, pData)
                reject(new Error(pData))
              }
            })
          })
          patchReq.on('error', reject)
          patchReq.write(body)
          patchReq.end()
        } else {
          // POST (신규)
          const postUrl = new URL(`${SUPABASE_URL}/rest/v1/posts`)
          const postReq = https.request({
            hostname: postUrl.hostname,
            path: postUrl.pathname,
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
              'Prefer': 'return=representation'
            }
          }, (pRes) => {
            let pData = ''
            pRes.on('data', chunk => pData += chunk)
            pRes.on('end', () => {
              if (pRes.statusCode === 201) {
                const result = JSON.parse(pData)[0]
                console.log('랜딩 신규 생성 성공!')
                console.log('제목:', result.title)
                console.log('ID:', result.id)
                resolve(result)
              } else {
                console.error('랜딩 신규 생성 실패:', pRes.statusCode, pData)
                reject(new Error(pData))
              }
            })
          })
          postReq.on('error', reject)
          postReq.write(body)
          postReq.end()
        }
      })
    })
    checkReq.on('error', reject)
    checkReq.end()
  })
}

// 마크다운 파일 읽기 및 HTML 변환
const mdContent = fs.readFileSync('/workspace/content/posts/2026-10-01-all-coaches-oct-sat-36picks-landing.md', 'utf8')
const htmlContent = marked(mdContent)

const isPublished = !isDraft
console.log(`[Landing] 모드: ${isDraft ? 'draft (is_published=false)' : 'publish (is_published=true)'}`)

publishToLanding({
  id: '2026-10-01-all-coaches-oct-sat-36picks',
  title: 'SuperfastSAT 코치 6인이 고른 10월 SAT 예상 36문항',
  content: htmlContent,
  excerpt: 'Brandon, Ben, 박시원, Laura, Julie, Dana Jung — SuperfastSAT 코치 여섯 명이 각자 6문항씩 골랐습니다. 읽기·쓰기 3문항, 수학 3문항. 10월 시험에서 다시 만날 가능성이 높은 유형과 함정 포인트를 담았습니다.',
  description: 'SuperfastSAT 코치 6인이 고른 10월 SAT 예상 36문항 — RW·수학 각 3문항씩, 코치별 선정 이유와 핵심 함정 해설 수록. 9월에 처음 등장한 유형, 정답률 35% 이하 고난도 문항 중심.',
  featured_image: null,
  category: 'SAT학습팁',
  tags: ['SAT', '10월 SAT', 'SAT 예상문제', 'SAT 문제 풀이', 'Brandon', 'Ben', '박시원', 'Laura', 'Julie', 'Dana Jung', 'SAT Math', 'SAT RW', 'SuperfastSAT 코치'],
  author: '배병윤',
  date: '2026-10-01',
  focus_keyword: '10월 SAT 예상 문항',
  cta_featured: false,
  is_published: isPublished
})
