/**
 * blog_archive/ 저장 유틸리티
 * publish-all.js에서 --publish 시 호출됨
 */
const fs = require('fs')
const path = require('path')

const ARCHIVE_ROOT = path.join(__dirname, '..', 'blog_archive')

/**
 * ghost 마크다운 파일에서 메타와 본문을 파싱
 * 두 가지 포맷 지원:
 *   1. HTML 주석 + # 제목 본문
 *   2. YAML frontmatter + 본문
 */
function parseGhostMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const meta = {}
  let body = raw

  // YAML frontmatter 형식
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/)
  if (fmMatch) {
    const fmLines = fmMatch[1].split('\n')
    for (const line of fmLines) {
      const m = line.match(/^(\w[\w_]+):\s*["']?(.*?)["']?$/)
      if (m) meta[m[1].trim()] = m[2].trim()
      // tags 배열 파싱
      const tagMatch = line.match(/^tags:\s*\[(.+)\]/)
      if (tagMatch) {
        meta.tags = tagMatch[1].split(',').map(t => t.replace(/['"]/g, '').trim())
      }
    }
    body = fmMatch[2]
  } else {
    // HTML 주석 형식
    const commentMatch = raw.match(/<!--([\s\S]*?)-->/)
    if (commentMatch) {
      const lines = commentMatch[1].trim().split('\n')
      for (const line of lines) {
        const m = line.match(/^([^:]+):\s*(.+)$/)
        if (m) meta[m[1].trim()] = m[2].trim()
      }
      body = raw.replace(/<!--[\s\S]*?-->/, '').trim()
    }
  }

  // 내부용 섹션 이전까지만 본문
  const internalMatch = body.match(/\n## (레퍼런스|Supabase|내부용|\(내부용\))/)
  if (internalMatch) {
    body = body.slice(0, internalMatch.index).trim()
  }

  return { meta, body }
}

/**
 * 포스트를 blog_archive/에 저장
 *
 * @param {object} opts
 * @param {string} opts.ghostFilePath  - content/posts/...ghost.md 경로
 * @param {string} opts.slug
 * @param {string} opts.title
 * @param {string} opts.date           - YYYY-MM-DD
 * @param {string[]} opts.tags
 * @param {string} opts.category
 * @param {string} [opts.excerpt]
 */
function saveToArchive({ ghostFilePath, slug, title, date, tags, category, excerpt }) {
  const { meta, body } = parseGhostMarkdown(ghostFilePath)

  // 파일에서 읽은 메타가 있으면 우선 사용
  const finalTitle = title || meta.title || meta['SEO Title'] || ''
  const finalExcerpt = excerpt || meta.excerpt || meta['Meta Description'] || ''
  const finalTags = tags || meta.tags || []
  const finalSlug = slug || meta.slug || ''
  const finalDate = date || meta.date || new Date().toISOString().slice(0, 10)
  const finalCategory = category || meta.category || ''

  const yearMonth = finalDate.slice(0, 7)
  const dir = path.join(ARCHIVE_ROOT, yearMonth)
  fs.mkdirSync(dir, { recursive: true })

  const today = new Date().toISOString().slice(0, 10)

  const lines = [
    '---',
    `title: "${finalTitle.replace(/"/g, '\\"')}"`,
    `slug: ${finalSlug}`,
    `date: ${finalDate}`,
    `archived_at: ${today}`,
    `tags: [${finalTags.map(t => `"${t}"`).join(', ')}]`,
    finalCategory ? `category: "${finalCategory}"` : null,
    `status: published`,
    finalExcerpt ? `meta_description: "${finalExcerpt.replace(/"/g, '\\"')}"` : null,
    '---',
  ].filter(Boolean)

  const content = `${lines.join('\n')}\n\n${body}\n`
  const outPath = path.join(dir, `${finalSlug}.md`)
  fs.writeFileSync(outPath, content, 'utf8')
  console.log(`📁 아카이브 저장: blog_archive/${yearMonth}/${finalSlug}.md`)
  return outPath
}

module.exports = { saveToArchive, parseGhostMarkdown }
