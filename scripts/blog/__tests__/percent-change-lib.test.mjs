import test from 'node:test';
import assert from 'node:assert/strict';
import { PROBLEMS } from '../percent-change-problems.mjs';
import { renderProblem, buildPostHtml, buildPost, POST_ID } from '../percent-change-lib.mjs';

const MD = '# 제목\n\n도입부입니다.\n\n<!--PROBLEMS:percent-->\n\n## 이것 기억하세요\n\n끝.\n\n```yaml\n_meta:\n  title_tag: "x"\n```\n';

test('REQ-001: 문제는 정확히 10개이고 필드가 채워져 있다', () => {
  assert.equal(PROBLEMS.length, 10);
  const ids = new Set(PROBLEMS.map((p) => p.id));
  assert.equal(ids.size, 10);
  for (const p of PROBLEMS) {
    for (const k of ['id', 'source', 'skill', 'stem', 'answer', 'solution', 'trap']) {
      assert.ok(p[k] && String(p[k]).length > 0, `${p.id}.${k} 비어 있음`);
    }
  }
});

test('REQ-001: 보기가 있는 문제는 보기 4개이고 정답은 A~D 글자다', () => {
  const mc = PROBLEMS.filter((p) => p.choices);
  assert.equal(mc.length, 4);
  for (const p of mc) {
    assert.equal(p.choices.length, 4, p.id);
    assert.match(p.answer, /^[A-D]$/, p.id);
  }
});

test('REQ-001: 확인된 정답값', () => {
  const ans = Object.fromEntries(PROBLEMS.map((p) => [p.id, p.answer]));
  assert.equal(ans['98818acf'], '2.31');
  assert.equal(ans['6feae9c3'], 'C');
  assert.equal(ans['58ba7239'], '302.4');
  assert.equal(ans['28ff3966'], 'B');
  assert.equal(ans['8bb94668'], 'D');
  assert.equal(ans['7bbfbe70'], 'D');
  assert.equal(ans['oct-f0945cc0'], '1200');
  assert.equal(ans['oct-52d70e35'], '44');
  assert.equal(ans['oct-9fddfb77'], '1952');
  assert.equal(ans['nov-d2476aed'], '8');
});

test('REQ-002: 카드는 정답과 해설을 details 안에 둔다', () => {
  for (const p of PROBLEMS) {
    const html = renderProblem(p, 1);
    const [before, inside] = html.split('<details');
    assert.ok(inside, `${p.id} details 없음`);
    assert.ok(!before.includes('정답'), `${p.id} 정답이 details 밖에 있음`);
    assert.ok(inside.includes('정답'), p.id);
    assert.ok(inside.includes('함정'), p.id);
    assert.equal((html.match(/\\\(/g) || []).length, (html.match(/\\\)/g) || []).length, `${p.id} 수식 짝`);
  }
});

test('REQ-002: 보기 없는 문제는 직접 입력 표기', () => {
  const grid = PROBLEMS.find((p) => !p.choices);
  assert.match(renderProblem(grid, 1), /직접 입력/);
  const mc = PROBLEMS.find((p) => p.choices);
  assert.doesNotMatch(renderProblem(mc, 1), /직접 입력/);
});

test('REQ-003: 마커가 카드 10개로 치환되고 H1과 _meta는 빠진다', () => {
  const html = buildPostHtml(MD, PROBLEMS);
  assert.ok(!html.includes('<!--PROBLEMS:percent-->'));
  assert.equal((html.match(/<details/g) || []).length, 10);
  assert.ok(!html.includes('_meta'));
  assert.ok(!html.includes('<h1'));
  assert.ok(html.includes('이것 기억하세요'));
});

test('REQ-004: buildPost는 항상 비공개(is_published=false)다', () => {
  const post = buildPost(MD);
  assert.equal(post.is_published, false);
  assert.equal(post.id, POST_ID);
  assert.equal(post.meta_robots, 'noindex, nofollow');
  assert.equal(post.title, '제목');
  assert.ok(post.content.length > 0);
});

test('REQ-003: 원고 속 수식은 marked를 거쳐도 \\( \\) 가 보존된다', () => {
  const html = buildPostHtml('# t\n\n배율은 \\(1 + r\\)이고 \\(1 - r\\)입니다.\n\n<!--PROBLEMS:percent-->\n');
  assert.ok(html.includes('\\(1 + r\\)'));
  assert.ok(html.includes('\\(1 - r\\)'));
  assert.ok(!html.includes('MATHSLOT'));
});

test('REQ-003: 실제 원고가 빌드되고 수식 짝이 맞다', async () => {
  const { readFileSync } = await import('node:fs');
  const md = readFileSync(new URL('../../../content/posts/2026-11-06-percent-change-10-problems-landing.md', import.meta.url), 'utf8');
  const html = buildPost(md).content;
  assert.equal((html.match(/<details/g) || []).length, 10);
  assert.equal((html.match(/\\\(/g) || []).length, (html.match(/\\\)/g) || []).length);
  assert.ok(!html.includes('MATHSLOT') && !html.includes('<!--PROBLEMS'));
});

test('REQ-003: 카드 속 $& 같은 치환 패턴이 본문에서 훼손되지 않는다', () => {
  const p = { ...PROBLEMS[0], stem: 'cost is $& and $` and $\' here' };
  const html = buildPostHtml(MD, [p]);
  assert.ok(html.includes('cost is $& and $` and $\' here'));
});
