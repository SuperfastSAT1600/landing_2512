import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractProblems, renderProblem, fracToLatex, buildPostHtml, parsePublishArgs } from '../nov-sat-lib.mjs';
import { JSDOM } from 'jsdom';
import { VOICE } from '../nov-sat-voice.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.join(here, '../../../content/posts/data/nov-sat-artifact-source.html');
const problems = extractProblems(fs.readFileSync(SOURCE, 'utf8'));

// REQ-001
test('34 problems: 15 Math, 19 RW', () => {
  assert.equal(problems.length, 34);
  assert.equal(problems.filter((p) => p.section === 'Math').length, 15);
  assert.equal(problems.filter((p) => p.section === 'RW').length, 19);
});

test('every problem has id, skill, answer and all four parts', () => {
  for (const p of problems) {
    assert.ok(p.id && p.skill && p.answer, `missing basics in ${p.id}`);
    for (const k of ['theory', 'solution', 'trap', 'reason']) assert.ok(p.parts[k], `${p.id} missing ${k}`);
  }
});

test('exactly one figure (HARD MATH 04) and three tables are preserved', () => {
  const withImg = problems.filter((p) => p.testHtml.includes('<img'));
  assert.deepEqual(withImg.map((p) => p.id), ['hard-math-04']);
  assert.match(withImg[0].testHtml, /src="data:image\/svg\+xml;base64,/);
  const tables = problems.reduce((n, p) => n + (p.testHtml.match(/<table/g) || []).length, 0);
  assert.equal(tables, 3);
});

test('multiple-choice problems keep 4 choices with exactly one marked right', () => {
  const mc = problems.filter((p) => p.choices.length);
  assert.ok(mc.length >= 30);
  for (const p of mc) {
    assert.equal(p.choices.length, 4, p.id);
    assert.equal(p.choices.filter((c) => c.right).length, 1, p.id);
    assert.equal(p.choices.find((c) => c.right).letter, p.answer, `${p.id} answer mismatch`);
  }
});

// REQ-002
test('fracToLatex converts nested markup', () => {
  const el = new JSDOM('<span class="frac"><span>sin <i>X</i></span><span>cos <i>Y</i></span></span>').window.document.querySelector('.frac');
  assert.equal(fracToLatex(el), '\\(\\frac{\\sin X}{\\cos Y}\\)');
  const el2 = new JSDOM('<span class="frac"><span>10<i>x</i><sup>2</sup></span><span><i>x</i><sup>2</sup> − 9<i>k</i><sup>2</sup></span></span>').window.document.querySelector('.frac');
  assert.equal(fracToLatex(el2), '\\(\\frac{10x^{2}}{x^{2} - 9k^{2}}\\)');
});

test('no artifact-only classes survive and math delimiters are balanced', () => {
  for (const p of problems) {
    const html = renderProblem(p);
    for (const cls of ['frac', 'blank', 'bub', 'spr', 'reveal']) {
      assert.ok(!new RegExp(`class="[^"]*\\b${cls}\\b`).test(html), `${p.id} still has class ${cls}`);
    }
    assert.equal((html.match(/\\\(/g) || []).length, (html.match(/\\\)/g) || []).length, `${p.id} unbalanced \\( \\)`);
    assert.ok(!/(?<!\\)\$/.test(html), `${p.id} contains an unescaped $ (MathJax would read it as a math delimiter)`);
  }
});

test('answers are always inside a details block, problem text is outside', () => {
  const html = renderProblem(problems[0]);
  assert.match(html, /<details/);
  assert.ok(html.indexOf('<details') > html.indexOf('The price of an item'));
});

// REQ-003 / REQ-005
test('buildPostHtml inlines all 34 problems and strips the _meta block', () => {
  const md = fs.readFileSync(path.join(here, '../../../content/posts/2026-11-04-nov-sat-recurring-34-problems-landing.md'), 'utf8');
  const html = buildPostHtml(md, problems);
  assert.equal((html.match(/<details/g) || []).length, 34);
  assert.ok(!html.includes('<!--PROBLEMS'), 'markers left behind');
  assert.ok(!html.includes('_meta'), '_meta leaked into body');
  assert.ok(html.trim().startsWith('<'), 'must start with "<" so getPostData serves it as raw HTML');
  assert.ok(html.indexOf('id="math-01"') < html.indexOf('id="rw-01"'), 'Math section comes before RW');
});

test('publish args default to draft', () => {
  assert.deepEqual(parsePublishArgs([]), { isDraft: true });
  assert.deepEqual(parsePublishArgs(['--draft']), { isDraft: true });
  assert.deepEqual(parsePublishArgs(['--publish']), { isDraft: false });
});

test('table cells carry data-label so tables can stack on mobile', () => {
  const t = problems.filter((p) => p.testHtml.includes('<table'));
  assert.equal(t.length, 3);
  for (const p of t) {
    assert.match(p.testHtml, /class="nsat-table"/);
    assert.ok(!/data-label=""/.test(p.testHtml), `${p.id} has an unlabeled cell`);
    assert.match(p.testHtml, /data-label="[^"]+"/);
  }
});

// 2차 수정: 제목 중복 제거, 정답 숨김, 합니다체 설명
const plain = (s) => s.replace(/<[^>]+>/g, '');

test('post body does not repeat the title as an h1', () => {
  const md = fs.readFileSync(path.join(here, '../../../content/posts/2026-11-04-nov-sat-recurring-34-problems-landing.md'), 'utf8');
  assert.ok(!/<h1/i.test(buildPostHtml(md, problems)), 'blog page already renders the title');
});

test('the answer is hidden until the details block is opened', () => {
  for (const p of problems) {
    const html = renderProblem(p);
    const summary = html.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)[1];
    assert.ok(!/정답/.test(summary), `${p.id} leaks the answer in the summary`);
    const inner = html.slice(html.indexOf('</summary>'));
    assert.match(inner, /정답/);
    assert.ok(!/<strong>풀이<\/strong>/.test(inner), `${p.id} still shows 풀이`);
    for (const label of ['핵심 이론', '함정', '왜 이 문제인가']) assert.ok(inner.includes(`<strong>${label}</strong>`), `${p.id} missing ${label}`);
  }
});

test('every explanation is written in 합니다체 (each sentence ends with 니다.)', () => {
  assert.deepEqual(Object.keys(VOICE).sort(), problems.map((p) => p.id).sort());
  for (const [id, v] of Object.entries(VOICE)) {
    for (const k of ['theory', 'trap', 'reason']) {
      assert.ok(v[k], `${id}.${k} empty`);
      for (const s of plain(v[k]).split(/(?<=[.])\s+/)) assert.match(s, /니다\.$/, `${id}.${k}: "${s}"`);
    }
  }
});

test('rendered cards use the 합니다체 text, not the artifact text', () => {
  assert.ok(renderProblem(problems[0]).includes(VOICE[problems[0].id].theory));
});
