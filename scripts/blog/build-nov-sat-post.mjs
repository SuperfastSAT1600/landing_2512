// 원고(md) + 아티팩트 문제 -> content/posts/data/nov-sat-34.html (포스트 본문 HTML)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractProblems, buildPostHtml } from './nov-sat-lib.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const md = fs.readFileSync(path.join(root, 'content/posts/2026-11-04-nov-sat-recurring-34-problems-landing.md'), 'utf8');
const src = fs.readFileSync(path.join(root, 'content/posts/data/nov-sat-artifact-source.html'), 'utf8');
const html = buildPostHtml(md, extractProblems(src));
const out = path.join(root, 'content/posts/data/nov-sat-34.html');
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(root, out)} (${html.length} chars)`);
