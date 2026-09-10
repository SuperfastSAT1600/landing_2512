require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const { marked } = require('marked')

const isDraft = !process.argv.includes('--publish')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const raw = fs.readFileSync(
  '/workspace/content/posts/2026-09-03-sat-math-m2-time-management-landing.md',
  'utf8'
)

const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/)
if (!fmMatch) { console.error('frontmatter 없음'); process.exit(1) }

const fmRaw = fmMatch[1]
const bodyRaw = fmMatch[2]

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

const excerptMatch = bodyRaw.match(/excerpt:\s*"([^"]+)"/)
const descriptionMatch = bodyRaw.match(/description:\s*"([^"]+)"/)
const excerpt = excerptMatch ? excerptMatch[1] : ''
const description = descriptionMatch ? descriptionMatch[1] : ''

const body = bodyRaw.split(/\n_meta:/)[0].trim()
const content = marked.parse(body)

async function run() {
  console.log(`[Landing] 모드: ${isDraft ? 'draft' : 'publish'}`)
  console.log('[Landing] 원고:', title)
  console.log('[Landing] slug:', slug)

  const { data, error } = await supabase
    .from('posts')
    .upsert({
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
      cta_featured: false,
      is_published: !isDraft
    }, { onConflict: 'id' })
    .select()

  if (error) { console.error('❌ 실패:', error.message); process.exit(1) }

  console.log('✅ 발행 성공!')
  console.log('제목:', data[0].title)
  console.log('URL: https://superfastsat.com/blog/' + data[0].id)
}

run().catch(err => { console.error(err.message); process.exit(1) })
