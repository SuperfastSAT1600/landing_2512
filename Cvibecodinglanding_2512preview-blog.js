const http = require('http');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const PORT = 3333;
const POSTS_DIR = path.join(__dirname, 'sat', 'content', 'posts');

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

function generateHTML(title, content, frontmatter) {
  const htmlContent = marked(content);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f9f9f9; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { font-size: 28px; font-weight: 700; margin: 30px 0 15px 0; }
    h2 { font-size: 20px; font-weight: 700; margin: 25px 0 15px 0; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
    p { margin: 0 0 15px 0; }
    ul, ol { margin: 0 0 15px 0; padding-left: 20px; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    a { color: #071be9; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .copy-button { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #071be9; color: white; border: none; border-radius: 5px; cursor: pointer; z-index: 1000; }
    .instruction { background: #fff8e6; border-left: 4px solid #ffa500; padding: 15px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <button class="copy-button" onclick="copyIt()">📋 전체 복사</button>
  <div class="container">
    <div class="instruction">
      <strong>⚠️ 안내:</strong> 아래 내용을 복사한 후 네이버 블로그 에디터에 붙여넣으세요.
    </div>
    <div id="content">${htmlContent}</div>
  </div>
  <script>
    function copyIt() {
      const el = document.getElementById('content');
      const text = el.innerText;
      navigator.clipboard.writeText(text).then(() => {
        alert('✅ 복사되었습니다!');
      }).catch(() => alert('❌ 복사 실패'));
    }
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('-naver.md'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const list = files.map(f => `<li><a href="/?post=${f.replace('-naver.md', '')}">${f}</a></li>`).join('');
    res.end(`<html><head><meta charset="UTF-8"><title>블로그</title><style>body{font-family:sans-serif;padding:20px}h1{color:#071be9}a{color:#071be9;text-decoration:none}</style></head><body><h1>📝 블로그 포스팅</h1><ul>${list}</ul></body></html>`);
  } else if (req.url.startsWith('/?post=')) {
    const name = req.url.replace('/?post=', '');
    const file = path.join(POSTS_DIR, `${name}-naver.md`);
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter, content: body } = parseFrontmatter(content);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateHTML(frontmatter.title || name, body, frontmatter));
    } else {
      res.writeHead(404);
      res.end('<h1>404</h1>');
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n✅ 블로그 프리뷰 실행됨\n📍 http://localhost:${PORT}\n`);
});
