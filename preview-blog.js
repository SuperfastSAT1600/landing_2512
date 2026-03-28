require('dotenv').config({ path: '.env.local' })
const http = require('http')
const fs = require('fs')
const path = require('path')
const { marked } = require('marked')

const PORT = 3333
const POSTS_DIR = './content/posts'
const STYLE_SAMPLES_PATH = './blog_database/style_samples.jsonl'

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

function appendStyleSample(filename, original, edited) {
  if (original.trim() === edited.trim()) return // 변경 없으면 기록 안 함

  const entry = {
    date: new Date().toISOString().slice(0, 10),
    source_file: filename,
    original,
    edited,
  }
  fs.appendFileSync(STYLE_SAMPLES_PATH, JSON.stringify(entry) + '\n', 'utf-8')
}

const server = http.createServer(async (req, res) => {

  // ─── 목록 ───────────────────────────────────────────────────────────────
  if (req.url === '/' || req.url === '/index') {
    const files = fs.readdirSync(POSTS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse()

    const links = files.map(f => {
      const name = f.replace('.md', '')
      return `<li><a href="/edit/${encodeURIComponent(f)}">${name}</a></li>`
    }).join('\n')

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>SuperfastSAT 블로그 미리보기</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #071be9; }
    li { margin: 10px 0; font-size: 16px; }
    a { color: #071be9; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head><body>
  <h1>📝 블로그 포스팅 미리보기</h1>
  <ul>${links}</ul>
</body></html>`)

  // ─── 편집 페이지 ────────────────────────────────────────────────────────
  } else if (req.url.startsWith('/edit/')) {
    const filename = decodeURIComponent(req.url.replace('/edit/', ''))
    const filepath = path.join(POSTS_DIR, filename)

    if (!fs.existsSync(filepath)) {
      res.writeHead(404); res.end('파일을 찾을 수 없습니다.'); return
    }

    const markdown = fs.readFileSync(filepath, 'utf-8')
    const preview = marked(markdown)
    const escaped = markdown.replace(/`/g, '\\`').replace(/\\/g, '\\\\').replace(/\${/g, '\\${')

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>편집: ${filename}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Sans KR', sans-serif; height: 100vh; display: flex; flex-direction: column; }

    .toolbar {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 20px; background: #071be9; color: white;
    }
    .toolbar a { color: white; text-decoration: none; font-size: 14px; opacity: 0.8; }
    .toolbar a:hover { opacity: 1; }
    .toolbar span { font-weight: bold; font-size: 15px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn-save {
      padding: 8px 20px; background: white; color: #071be9;
      border: none; border-radius: 6px; font-weight: bold; font-size: 14px;
      cursor: pointer; white-space: nowrap;
    }
    .btn-save:hover { background: #e8ebff; }
    .btn-save:disabled { opacity: 0.5; cursor: default; }
    .status { font-size: 13px; opacity: 0.85; white-space: nowrap; }

    .panes { display: flex; flex: 1; overflow: hidden; }

    .editor-pane {
      width: 50%; border-right: 2px solid #e0e0e0;
      display: flex; flex-direction: column;
    }
    .editor-pane label {
      padding: 8px 14px; font-size: 12px; font-weight: bold;
      color: #555; background: #f9f9f9; border-bottom: 1px solid #e0e0e0;
    }
    textarea {
      flex: 1; padding: 20px; font-family: 'Menlo', 'Consolas', monospace;
      font-size: 13px; line-height: 1.7; resize: none; border: none; outline: none;
      color: #222;
    }

    .preview-pane {
      width: 50%; overflow-y: auto; padding: 28px 32px; line-height: 1.85;
    }
    .preview-pane h1, .preview-pane h2, .preview-pane h3 { color: #071be9; margin: 1.4em 0 0.6em; }
    .preview-pane p { margin: 0.7em 0; }
    .preview-pane blockquote {
      border-left: 4px solid #071be9; padding-left: 16px;
      color: #555; margin: 16px 0; font-style: italic;
    }
    .preview-pane table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    .preview-pane th, .preview-pane td { border: 1px solid #ddd; padding: 9px 12px; }
    .preview-pane th { background: #f5f5f5; font-weight: bold; }
    .preview-pane hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .preview-pane code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; font-size: 0.9em; }
    .preview-pane pre { background: #f4f4f4; padding: 14px; border-radius: 6px; overflow-x: auto; }
    .preview-pane pre code { background: none; padding: 0; }
    .preview-pane a { color: #071be9; }

    .toast {
      position: fixed; bottom: 24px; right: 24px;
      background: #222; color: white; padding: 12px 20px;
      border-radius: 8px; font-size: 14px; display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
  </style>
</head><body>

<div class="toolbar">
  <a href="/">← 목록</a>
  <span>${filename}</span>
  <span class="status" id="status"></span>
  <button class="btn-save" id="saveBtn" onclick="save()">💾 저장 &amp; 학습</button>
</div>

<div class="panes">
  <div class="editor-pane">
    <label>✏️ 마크다운 편집</label>
    <textarea id="editor" spellcheck="false" oninput="updatePreview()">${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
  </div>
  <div class="preview-pane" id="preview">
    ${preview}
  </div>
</div>

<div class="toast" id="toast"></div>

<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
  const originalContent = document.getElementById('editor').value
  const editor = document.getElementById('editor')
  const preview = document.getElementById('preview')
  const saveBtn = document.getElementById('saveBtn')
  const status = document.getElementById('status')

  function updatePreview() {
    preview.innerHTML = marked.parse(editor.value)
    const changed = editor.value !== originalContent
    status.textContent = changed ? '● 수정 중' : ''
  }

  function showToast(msg, duration = 2500) {
    const t = document.getElementById('toast')
    t.textContent = msg
    t.style.display = 'block'
    setTimeout(() => { t.style.display = 'none' }, duration)
  }

  async function save() {
    saveBtn.disabled = true
    saveBtn.textContent = '저장 중…'
    try {
      const res = await fetch('/save/${encodeURIComponent(filename)}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editor.value,
          original: originalContent
        })
      })
      const data = await res.json()
      if (data.ok) {
        showToast(data.learned ? '✅ 저장 완료 — 스타일 샘플로 학습되었습니다!' : '✅ 저장 완료 (변경 없음)')
        status.textContent = ''
      } else {
        showToast('❌ 저장 실패: ' + data.error)
      }
    } catch(e) {
      showToast('❌ 오류: ' + e.message)
    }
    saveBtn.disabled = false
    saveBtn.textContent = '💾 저장 & 학습'
  }

  // Tab key → 들여쓰기
  editor.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const s = editor.selectionStart, end = editor.selectionEnd
      editor.value = editor.value.slice(0, s) + '  ' + editor.value.slice(end)
      editor.selectionStart = editor.selectionEnd = s + 2
      updatePreview()
    }
    // Ctrl+S / Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      save()
    }
  })
</script>
</body></html>`)

  // ─── 저장 API ────────────────────────────────────────────────────────────
  } else if (req.method === 'POST' && req.url.startsWith('/save/')) {
    const filename = decodeURIComponent(req.url.replace('/save/', ''))
    const filepath = path.join(POSTS_DIR, filename)

    try {
      const { content, original } = await parseBody(req)

      if (!content || typeof content !== 'string') {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: '내용이 비어 있습니다.' }))
        return
      }

      // 파일 저장
      fs.writeFileSync(filepath, content, 'utf-8')

      // 스타일 샘플 기록
      const changed = content.trim() !== (original || '').trim()
      if (changed) {
        fs.mkdirSync('./blog_database', { recursive: true })
        appendStyleSample(filename, original, content)
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, learned: changed }))

    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: e.message }))
    }

  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, () => {
  console.log(`✅ 블로그 미리보기+편집 서버 실행 중`)
  console.log(`👉 http://localhost:${PORT}`)
  console.log(`   - 좌측: 마크다운 편집 / 우측: 실시간 미리보기`)
  console.log(`   - Ctrl+S 또는 [저장 & 학습] 버튼으로 저장`)
  console.log(`   - 수정본은 blog_database/style_samples.jsonl에 자동 기록됩니다`)
})
