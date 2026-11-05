// 11월 SAT 아티팩트(article.q) -> 랜딩 블로그 호환 HTML 변환
// 블로그는 MathJax(\( \))와 인라인 style만 믿고, 아티팩트 전용 CSS 클래스는 쓰지 않는다.
import { JSDOM } from 'jsdom';
import { marked } from 'marked';
import { VOICE } from './nov-sat-voice.mjs';

const FUNCS = ['sin', 'cos', 'tan'];

function nodeToLatex(node) {
  if (node.nodeType === 3) {
    let t = node.textContent.replace(/−/g, '-').replace(/×/g, '\\times ');
    for (const f of FUNCS) t = t.replace(new RegExp(`\\b${f}\\b`, 'g'), `\\${f}`);
    return t;
  }
  const inner = [...node.childNodes].map(nodeToLatex).join('');
  if (node.tagName === 'SUP') return `^{${inner}}`;
  if (node.tagName === 'SUB') return `_{${inner}}`;
  return inner;
}

export function fracToLatex(el) {
  const [num, den] = [...el.children];
  return `\\(\\frac{${nodeToLatex(num).trim()}}{${nodeToLatex(den).trim()}}\\)`;
}

const BUBBLE =
  'display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:1.5px solid #c92f5f;border-radius:50%;font:600 12px/1 monospace;color:#c92f5f;flex:none;margin-top:2px';

function convertTest(test, doc) {
  const root = test.cloneNode(true);
  root.querySelectorAll('.frac').forEach((el) => el.replaceWith(doc.createTextNode(fracToLatex(el))));
  root.querySelectorAll('.blank').forEach((el) => {
    el.removeAttribute('class');
    el.setAttribute('style', 'display:inline-block;min-width:4em;border-bottom:1.5px solid currentColor;transform:translateY(-3px)');
  });
  root.querySelectorAll('ol.choices').forEach((ol) => {
    const wrap = doc.createElement('div');
    wrap.setAttribute('style', 'display:grid;gap:8px;margin:12px 0');
    ol.querySelectorAll(':scope > li').forEach((li) => {
      const letter = li.querySelector('.bub').textContent.trim();
      const body = li.querySelector('.bub').nextElementSibling.innerHTML;
      const row = doc.createElement('div');
      row.setAttribute('style', 'display:flex;gap:12px;align-items:flex-start');
      row.innerHTML = `<span style="${BUBBLE}">${letter}</span><span>${body}</span>`;
      wrap.appendChild(row);
    });
    ol.replaceWith(wrap);
  });
  root.querySelectorAll('p.spr').forEach((p) => p.remove());
  root.querySelectorAll('.t-wrap').forEach((w) => w.setAttribute('style', 'overflow-x:auto'));
  root.querySelectorAll('table').forEach((t) => {
    t.classList.add('nsat-table');
    const labels = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => td.setAttribute('data-label', labels[i] || '')));
  });
  root.querySelectorAll('table').forEach((t) => t.setAttribute('style', 'display:table;border-collapse:collapse;font-size:13px;width:100%'));
  root.querySelectorAll('th,td').forEach((c) => c.setAttribute('style', 'border:1px solid #d1d5db;padding:5px 7px;text-align:left;vertical-align:top'));
  root.querySelectorAll('caption').forEach((c) => c.setAttribute('style', 'text-align:left;font-weight:600;padding-bottom:6px'));
  root.querySelectorAll('p.stem').forEach((p) => p.classList.remove('stem'));
  root.querySelectorAll('[class=""]').forEach((e) => e.removeAttribute('class'));
  return root;
}

function convertInline(el, doc) {
  const c = el.cloneNode(true);
  c.querySelectorAll('.frac').forEach((f) => f.replaceWith(doc.createTextNode(fracToLatex(f))));
  return c.innerHTML.trim();
}

const escDollar = (s) => s.replace(/(?<!\\)\$/g, '\\$');

export function extractProblems(htmlSource) {
  const doc = new JSDOM(htmlSource).window.document;
  return [...doc.querySelectorAll('article.q')].map((art) => {
    const noRaw = art.querySelector('.q-no');
    const noText = [...noRaw.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    const id = noText.toLowerCase().replace(/\s+/g, '-');
    const section = noText.includes('RW') ? 'RW' : 'Math';
    const test = art.querySelector('.test');
    const converted = convertTest(test, doc);
    const choices = [...test.querySelectorAll('ol.choices > li')].map((li) => ({
      letter: li.querySelector('.bub').textContent.trim(),
      right: li.classList.contains('right'),
    }));
    const answer = art.querySelector('.answer').textContent.replace(/^ANSWER/, '').trim();
    const part = (label) => {
      const dt = [...art.querySelectorAll('dl.parts dt')].find((d) => d.textContent.trim() === label);
      return escDollar(convertInline(dt.nextElementSibling, doc));
    };
    return {
      id,
      noText,
      section,
      hard: noText.startsWith('HARD'),
      skill: art.querySelector('.q-skill').textContent.trim(),
      adTitle: escDollar(convertInline(art.querySelector('.ad h3'), doc)),
      adSub: escDollar(convertInline(art.querySelector('.ad p'), doc)),
      testHtml: escDollar(converted.innerHTML.replace(/\s*\n\s*/g, ' ').trim()),
      choices,
      answer,
      parts: { theory: part('핵심 이론'), solution: part('풀이'), trap: part('함정') },
    };
  });
}

const CARD = 'border:1px solid #e5e7eb;border-radius:14px;padding:20px 22px;margin:28px 0;background:#fff';
const PANEL = 'border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;margin:14px 0;background:#fafafa';

export function renderProblem(p) {
  const hardChip = p.hard
    ? ' <span style="font:600 11px/1 monospace;color:#fff;background:#c92f5f;border-radius:6px;padding:4px 7px;margin-left:6px">HARD</span>'
    : '';
  const v = VOICE[p.id] || p.parts;
  return [
    `<div id="${p.id}" style="${CARD}">`,
    `<p style="margin:0 0 4px;font:600 12px/1.4 monospace;letter-spacing:.08em;color:#c92f5f">${p.noText}${hardChip}</p>`,
    `<p style="margin:0 0 14px;font-size:13px;color:#6b7280">${p.skill}</p>`,
    `<div style="${PANEL};background:#fff;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.65">${p.testHtml}</div>`,
    `<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">풀이 보기</summary>`,
    `<div style="margin-top:12px;font-size:15px;line-height:1.75">`,
    `<p><strong>정답</strong> ${p.answer}</p>`,
    `<p><strong>핵심 이론</strong><br>${v.theory}</p>`,
    `<p><strong>함정</strong><br>${v.trap}</p>`,
    `</div></details>`,
    `</div>`,
  ].join('');
}

// 원고(md)의 _meta 블록을 떼고 marked로 변환한 뒤, 마커 자리에 변환된 문제 카드를 끼운다.
// 문제 HTML은 marked를 거치지 않아 수식의 \ 와 _ 가 훼손되지 않는다.
export function buildPostHtml(md, problems) {
  // 블로그 상세 페이지가 제목을 따로 그리므로 본문 첫 줄의 H1은 뗀다.
  const body = md.replace(/```yaml\s*\n_meta:[\s\S]*?```\s*$/m, '').replace(/^#\s+.*\n+/, '').trim();
  let html = marked(body, { gfm: true });
  for (const section of ['Math', 'RW']) {
    const cards = problems.filter((p) => p.section === section).map(renderProblem).join('\n');
    html = html.replace(`<!--PROBLEMS:${section.toLowerCase()}-->`, cards);
  }
  return `${html}\n${TABLE_CSS}`;
}

// 모바일에서 넓은 표가 잘리지 않도록 행 단위 카드로 쌓는다(블로그의 [&_table]:block 규칙보다 !important로 우선).
export const TABLE_CSS = `<style>
@media (max-width:640px){
.nsat-table,.nsat-table tbody,.nsat-table tr,.nsat-table td,.nsat-table caption{display:block !important;width:100% !important;box-sizing:border-box}
.nsat-table thead{display:none !important}
.nsat-table tr{border:1px solid #d1d5db !important;border-radius:8px;margin:8px 0;padding:6px 10px}
.nsat-table td{display:flex !important;justify-content:space-between;gap:12px;border:0 !important;padding:3px 0 !important;text-align:right !important}
.nsat-table td::before{content:attr(data-label);font-weight:600;color:#6b7280;text-align:left;flex:none;max-width:48%}
}
</style>`;

// 원고 첫 줄의 H1이 글 제목이다(발행 스크립트가 DB title로 쓴다).
export function extractPostTitle(md) {
  return md.match(/^#\s+(.+)$/m)[1].trim();
}

export function parsePublishArgs(argv) {
  return { isDraft: !argv.includes('--publish') };
}
