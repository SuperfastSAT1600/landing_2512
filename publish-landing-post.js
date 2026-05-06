require('dotenv').config({ path: '.env.local' })
const https = require('https')
const fs = require('fs')

// --draft (기본값) 또는 --publish
const isDraft = !process.argv.includes('--publish')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

// 간단한 마크다운 → HTML 변환기
function markdownToHtml(md) {
  let html = md

  // JSON-LD script 블록 제거 (SEO용이라 본문에 불필요)
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')

  // HR 구분선
  html = html.replace(/^---$/gm, '<hr>')

  // blockquote (> 로 시작하는 줄)
  html = html.replace(/^> \*\*(.+?)\*\*\n([\s\S]*?)(?=\n---|\n#|\n\n[^>]|$)/gm, (match, boldText, rest) => {
    const inner = rest.trim()
    return `<blockquote><p><strong>${boldText}</strong><br>${inner}</p></blockquote>`
  })
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')

  // H3
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  // H2
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  // H1
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // 테이블
  html = html.replace(/(\|.+\|\n)(\|[-| :]+\|\n)((\|.+\|\n?)+)/g, (match) => {
    const rows = match.trim().split('\n')
    const header = rows[0]
    const body = rows.slice(2)
    const thCells = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('')
    const tbRows = body.map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('')
      return `<tr>${cells}</tr>`
    }).join('\n')
    return `<table><thead><tr>${thCells}</tr></thead><tbody>${tbRows}</tbody></table>`
  })

  // 순서 없는 목록 (연속된 - 항목 묶기)
  html = html.replace(/(^- .+\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(line => {
      return `<li>${line.replace(/^- /, '').trim()}</li>`
    }).join('\n')
    return `<ul>\n${items}\n</ul>\n`
  })

  // 순서 있는 목록
  html = html.replace(/(^\d+\. .+\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(line => {
      return `<li>${line.replace(/^\d+\. /, '').trim()}</li>`
    }).join('\n')
    return `<ol>\n${items}\n</ol>\n`
  })

  // 굵게 + 기울임
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  // 굵게
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // 기울임
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // 링크
  html = html.replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

  // 빈 줄로 구분된 일반 텍스트를 p 태그로
  const lines = html.split('\n')
  const result = []
  let inBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 이미 HTML 블록 태그인 경우 그대로
    if (
      line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<ol') ||
      line.startsWith('<li') || line.startsWith('<table') || line.startsWith('<thead') ||
      line.startsWith('<tbody') || line.startsWith('<tr') || line.startsWith('<th') ||
      line.startsWith('<td') || line.startsWith('<blockquote') || line.startsWith('<hr') ||
      line.startsWith('</') || line === ''
    ) {
      result.push(line)
    } else {
      result.push(`<p>${line}</p>`)
    }
  }

  return result.join('\n')
}

async function publishToSupabase(post) {
  const body = JSON.stringify(post)

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
          console.log('랜딩 페이지 포스팅 성공!')
          console.log('제목:', post.title)
          console.log('ID:', post.id)
          console.log('is_published:', post.is_published)
          resolve(post)
        } else if (res.statusCode === 409) {
          console.error('이미 존재하는 ID입니다 (409 Conflict):', data)
          reject(new Error('DUPLICATE_ID: ' + data))
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

// --- 원고 파일 파싱 ---
const filePath = process.argv.find(a => a.endsWith('.md'))
if (!filePath) {
  console.error('사용법: node publish-landing-post.js <파일경로.md> [--draft|--publish]')
  process.exit(1)
}

const raw = fs.readFileSync(filePath, 'utf8')

// frontmatter 추출
const fmMatch = raw.match(/^---\n([\s\S]+?)\n---/)
if (!fmMatch) {
  console.error('frontmatter를 찾을 수 없습니다.')
  process.exit(1)
}

// 간단한 YAML 파서 (중첩 supabase_fields 포함)
function parseSimpleYaml(text) {
  const result = {}
  const lines = text.split('\n')
  let inSupabase = false
  const supabase = {}

  for (const line of lines) {
    if (line.startsWith('supabase_fields:')) {
      inSupabase = true
      continue
    }
    if (inSupabase) {
      if (line.startsWith('  ')) {
        const kv = line.trim().match(/^(\w+):\s*(.+)$/)
        if (kv) {
          let val = kv[2].replace(/^["']|["']$/g, '')
          // 태그 배열
          if (val.startsWith('[')) {
            val = val.replace(/[\[\]"]/g, '').split(',').map(s => s.trim())
          }
          supabase[kv[1]] = val
        }
      } else {
        inSupabase = false
      }
    }

    if (!line.startsWith('  ')) {
      const kv = line.match(/^(\w+):\s*(.+)$/)
      if (kv) {
        let val = kv[2].replace(/^["']|["']$/g, '')
        if (kv[1] === 'tags') {
          val = val.replace(/[\[\]]/g, '').split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
        }
        result[kv[1]] = val
      }
    }
  }
  result.supabase_fields = supabase
  return result
}

const fm = parseSimpleYaml(fmMatch[1])
const sf = fm.supabase_fields || {}

// 본문 추출 (두 번째 --- 이후)
const bodyRaw = raw.replace(/^---\n[\s\S]+?\n---\n/, '').trim()
const htmlContent = markdownToHtml(bodyRaw)

// 발행 데이터 구성
const post = {
  id: fm.slug || sf.id,
  title: sf.title || fm.title,
  content: htmlContent,
  excerpt: sf.excerpt,
  description: sf.description || fm.meta_description,
  featured_image: sf.featured_image || fm.og_image || null,
  category: sf.category || fm.category,
  tags: sf.tags || fm.tags || [],
  author: sf.author || fm.author || 'SuperfastSAT',
  date: sf.date || fm.date,
  focus_keyword: sf.focus_keyword || fm.focus_keyword || null,
  cta_featured: false,
  is_published: !isDraft
}

console.log(`[Landing] 모드: ${isDraft ? 'draft (is_published=false)' : 'publish (is_published=true)'}`)
console.log('[Landing] 발행 데이터:')
console.log('  id:', post.id)
console.log('  title:', post.title)
console.log('  category:', post.category)
console.log('  tags:', post.tags)
console.log('  is_published:', post.is_published)
console.log('')

publishToSupabase(post)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('발행 실패:', err.message)
    process.exit(1)
  })
