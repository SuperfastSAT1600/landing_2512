const http = require('http');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const url = require('url');

const PORT = 3333;
const POSTS_DIR = path.join(__dirname, 'sat', 'content', 'posts');
const ONTOLOGY_FILE = path.join(__dirname, 'sat', 'wiki', 'blog', 'modification-ontology.jsonl');
const PATTERNS_FILE = path.join(__dirname, 'sat', 'wiki', 'blog', 'patterns.jsonl');

function loadOntology() {
  try {
    if (!fs.existsSync(ONTOLOGY_FILE)) return [];
    return fs.readFileSync(ONTOLOGY_FILE, 'utf-8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  } catch (e) {
    console.error('Ontology load error:', e.message);
    return [];
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content };

  const frontmatter = {};
  match[1].split('\n').forEach((line) => {
    const [key, ...rest] = line.split(':');
    if (key) {
      frontmatter[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
    }
  });
  return { frontmatter, content: match[2] };
}

function generateHTML(title, content, frontmatter, postName) {
  const htmlContent = marked(content);
  const ontology = loadOntology();
  const categories = [...new Set(ontology.map(o => o.category))];
  const categoryOptions = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f9f9f9; padding: 20px; }
    .toolbar { position: fixed; top: 20px; right: 20px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; gap: 10px; flex-direction: column; z-index: 1000; }
    .toolbar select, .toolbar input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
    .toolbar button { padding: 8px 16px; background: #071be9; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .toolbar button:hover { background: #1a31f0; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
    h1, h2, h3 { margin: 20px 0 10px 0; }
    p { margin: 0 0 15px 0; }
    pre { background: #f5f5f5; padding: 15px; overflow-x: auto; }
    a { color: #071be9; text-decoration: none; }
  </style>
</head>
<body>
  <div class="toolbar">
    <label style="font-size: 12px; font-weight: 600; color: #666;">수정 카테고리</label>
    <select id="category" required>
      <option value="">선택...</option>
      ${categoryOptions}
    </select>
    <input type="text" id="reason" placeholder="수정 이유 (선택)" style="width: 200px;">
    <button onclick="saveModification('${postName}')">✅ 수정 완료</button>
    <button onclick="copyIt()">📋 전체 복사</button>
  </div>
  <div class="container">
    <div id="content">${htmlContent}</div>
  </div>
  <script>
    function copyIt() {
      navigator.clipboard.writeText(document.getElementById('content').innerText).then(() => alert('✅ 복사됨!')).catch(() => alert('❌ 실패'));
    }
    function saveModification(postName) {
      const category = document.getElementById('category').value;
      const reason = document.getElementById('reason').value;
      if (!category) {
        alert('❌ 카테고리를 선택해주세요');
        return;
      }
      fetch('/api/save-modification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postName, category, reason, timestamp: new Date().toISOString() })
      }).then(r => r.json()).then(result => {
        if (result.success) {
          alert('✅ 수정 기록 저장됨! final.md 파일을 생성하세요.');
          document.getElementById('category').value = '';
          document.getElementById('reason').value = '';
        } else {
          alert('❌ 저장 실패: ' + result.error);
        }
      });
    }
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/') {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('-naver.md'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const list = files.map(f => `<li><a href="/?post=${f.replace('-naver.md', '')}">${f}</a></li>`).join('');
    res.end(`<html><head><meta charset="UTF-8"><title>블로그</title><style>body{font-family:sans-serif;padding:20px}a{color:#071be9;text-decoration:none}</style></head><body><h1>📝 블로그 포스팅</h1><ul>${list}</ul></body></html>`);
  } else if (parsedUrl.pathname === '/' && parsedUrl.query.post) {
    const name = parsedUrl.query.post;
    const file = path.join(POSTS_DIR, `${name}-naver.md`);
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter, content: body } = parseFrontmatter(content);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateHTML(frontmatter.title || name, body, frontmatter, name));
    } else {
      res.writeHead(404);
      res.end('<h1>404</h1>');
    }
  } else if (parsedUrl.pathname === '/api/save-modification' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const entry = {
          id: `MOD-${Date.now()}`,
          post: data.postName,
          category: data.category,
          reason: data.reason || '',
          timestamp: data.timestamp,
          version: 'initial'
        };
        const line = JSON.stringify(entry) + '\n';
        fs.appendFileSync(PATTERNS_FILE, line);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, id: entry.id }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('<h1>404</h1>');
  }
});

server.listen(PORT, () => {
  console.log(`✅ http://localhost:${PORT}`);
});
