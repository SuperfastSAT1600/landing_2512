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
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
    h1, h2, h3 { margin: 20px 0 10px 0; }
    p { margin: 0 0 15px 0; }
    pre { background: #f5f5f5; padding: 15px; overflow-x: auto; }
    a { color: #071be9; text-decoration: none; }
    .copy-button { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #071be9; color: white; border: none; border-radius: 5px; cursor: pointer; }
  </style>
</head>
<body>
  <button class="copy-button" onclick="copyIt()">📋 전체 복사</button>
  <div class="container">
    <div id="content">${htmlContent}</div>
  </div>
  <script>
    function copyIt() {
      navigator.clipboard.writeText(document.getElementById('content').innerText).then(() => alert('✅ 복사됨!')).catch(() => alert('❌ 실패'));
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
    res.end(`<html><head><meta charset="UTF-8"><title>블로그</title><style>body{font-family:sans-serif;padding:20px}a{color:#071be9;text-decoration:none}</style></head><body><h1>📝 블로그 포스팅</h1><ul>${list}</ul></body></html>`);
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
  console.log(`✅ http://localhost:${PORT}`);
});
