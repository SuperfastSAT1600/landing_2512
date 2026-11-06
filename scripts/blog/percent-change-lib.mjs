// 퍼센트 변화 10문항 내부용 포스트: 문제 데이터 + 원고(md) -> 블로그 본문 HTML, posts 행
// 문제 카드는 marked를 거치지 않는다(수식의 \ 와 _ 보존). 블로그는 MathJax(\( \))와 인라인 style만 믿는다.
import { marked } from 'marked';
import { PROBLEMS } from './percent-change-problems.mjs';
import { extractPostTitle } from './nov-sat-lib.mjs';

export const POST_ID = '2026-11-06-percent-change-10-problems';

const CARD = 'border:1px solid #e5e7eb;border-radius:14px;padding:20px 22px;margin:28px 0;background:#fff';
const PANEL = 'border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;margin:14px 0;background:#fff;font-family:Georgia,\'Times New Roman\',serif;font-size:17px;line-height:1.65';
const BUBBLE = 'display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:1.5px solid #c92f5f;border-radius:50%;font:600 12px/1 monospace;color:#c92f5f;flex:none;margin-top:2px';
const CHIP = 'font:600 11px/1 monospace;color:#fff;background:#c92f5f;border-radius:6px;padding:4px 7px;margin-left:6px';

function renderChoices(choices) {
  const rows = choices.map((c, i) =>
    `<div style="display:flex;gap:12px;align-items:flex-start"><span style="${BUBBLE}">${'ABCD'[i]}</span><span>${c}</span></div>`);
  return `<div style="display:grid;gap:8px;margin:12px 0">${rows.join('')}</div>`;
}

export function renderProblem(p, no) {
  const label = `문제 ${String(no).padStart(2, '0')}`;
  const chip = p.level ? ` <span style="${CHIP}">${p.level.toUpperCase()}</span>` : '';
  const body = p.choices
    ? renderChoices(p.choices)
    : '<p style="margin:12px 0 0;font:600 13px/1.4 monospace;color:#6b7280">직접 입력 문제입니다. 보기는 없습니다.</p>';
  return [
    `<div id="${p.id}" style="${CARD}">`,
    `<p style="margin:0 0 4px;font:600 12px/1.4 monospace;letter-spacing:.08em;color:#c92f5f">${label}${chip}</p>`,
    `<p style="margin:0 0 14px;font-size:13px;color:#6b7280">${p.skill} · ${p.source} · ID ${p.id}</p>`,
    `<div style="${PANEL}"><p style="margin:0">${p.stem}</p>${body}</div>`,
    `<details style="margin-top:10px"><summary style="cursor:pointer;font-weight:700">풀이 보기</summary>`,
    `<div style="margin-top:12px;font-size:15px;line-height:1.75">`,
    `<p><strong>정답</strong> ${p.answer}</p>`,
    `<p><strong>풀이</strong><br>${p.solution}</p>`,
    `<p><strong>함정</strong><br>${p.trap}</p>`,
    `</div></details>`,
    `</div>`,
  ].join('');
}

// 원고의 _meta 블록과 H1을 떼고 marked로 변환한 뒤, 마커 자리에 문제 카드 전체를 끼운다.
export function buildPostHtml(md, problems = PROBLEMS) {
  const body = md.replace(/```yaml\s*\n_meta:[\s\S]*?```\s*$/m, '').replace(/^#\s+.*\n+/, '').trim();
  const cards = problems.map((p, i) => renderProblem(p, i + 1)).join('\n');
  // marked는 \( 의 백슬래시를 이스케이프로 먹으므로 원고 속 수식은 자리표시자로 빼 두었다가 되돌린다.
  const math = [];
  const guarded = body.replace(/\\\([\s\S]*?\\\)/g, (m) => `MATHSLOT${math.push(m) - 1}END`);
  return marked(guarded, { gfm: true })
    .replace(/MATHSLOT(\d+)END/g, (_, i) => math[Number(i)])
    .replace('<!--PROBLEMS:percent-->', () => cards);
}

// 내부 학생용이므로 항상 비공개다. 공개 전환 경로를 두지 않는다.
export function buildPost(md) {
  return {
    id: POST_ID,
    title: extractPostTitle(md),
    content: buildPostHtml(md),
    excerpt: '퍼센트가 늘거나 줄어드는 문제 10개를 풀이와 함정까지 정리했습니다. 내부 학생용 자료입니다.',
    description: '"p% greater than", "p% less than", "p% more than" 유형 10문항의 정답과 풀이, 흔한 함정을 정리한 내부 학생용 자료입니다.',
    category: 'SAT Math',
    tags: ['SAT', 'SAT Math', 'Percentages'],
    author: 'SuperfastSAT',
    date: '2026-11-06',
    focus_keyword: 'SAT 퍼센트 증감',
    meta_robots: 'noindex, nofollow',
    cta_featured: false,
    is_published: false,
  };
}
