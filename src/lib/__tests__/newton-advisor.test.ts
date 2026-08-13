import { describe, it, expect } from 'vitest';
import { parsePlan, citedNoteIds, buildAdvisorUserPrompt, NEWTON_VALUES } from '@/lib/newton-advisor';
import { DEMO_NOTES } from '@/app/demo/newton/fixtures/notes';
import { DEMO_ADVISOR_PLAN } from '@/app/demo/newton/fixtures/advisor-plan';

const minimal = JSON.stringify({
  summary: 's',
  signals: [{ title: 'T', detail: 'd', severity: 'critical', noteIds: ['note-01'] }],
  thisWeek: [
    { task: 'Do X', owner: 'A', due: 'by Friday', why: 'w', value: 'Empower Minds', noteIds: ['note-02'] },
  ],
  thisMonth: [],
  thisQuarter: [],
  risks: [],
});

describe('parsePlan', () => {
  it('정상 JSON을 플랜으로 파싱한다', () => {
    const plan = parsePlan(minimal);
    expect(plan).not.toBeNull();
    expect(plan!.signals[0].title).toBe('T');
    expect(plan!.thisWeek[0].value).toBe('Empower Minds');
  });

  it('코드펜스와 앞뒤 잡텍스트를 견딘다', () => {
    const plan = parsePlan('Here you go:\n```json\n' + minimal + '\n```\nDone.');
    expect(plan?.signals).toHaveLength(1);
  });

  it('깨진 JSON·빈 입력·내용 없는 응답은 null을 반환한다', () => {
    expect(parsePlan('')).toBeNull();
    expect(parsePlan('not json at all')).toBeNull();
    expect(parsePlan('{ "summary": "x", broken')).toBeNull();
    expect(parsePlan(JSON.stringify({ summary: 'x', signals: [], thisWeek: [] }))).toBeNull();
  });

  it('허용되지 않은 value는 기본값으로 눕힌다', () => {
    const raw = JSON.stringify({
      signals: [],
      thisWeek: [{ task: 'a', owner: 'o', due: 'd', why: 'w', value: 'Made Up Value', noteIds: [] }],
    });
    expect(parsePlan(raw)!.thisWeek[0].value).toBe('Nurture Excellence');
  });

  it('task가 비어 있는 항목은 버린다', () => {
    const raw = JSON.stringify({
      signals: [{ title: 'keep', detail: '', severity: 'watch', noteIds: [] }],
      thisWeek: [{ owner: 'o' }, { task: 'real', owner: 'o', due: 'd', why: '', value: 'Empower Minds' }],
    });
    expect(parsePlan(raw)!.thisWeek).toHaveLength(1);
  });

  it('구 스키마(action/rationale)도 새 필드로 받아준다', () => {
    const raw = JSON.stringify({
      signals: [],
      thisWeek: [{ action: 'legacy', owner: 'o', due: 'd', rationale: 'old reason', value: 'Empower Minds' }],
    });
    const plan = parsePlan(raw)!;
    expect(plan.thisWeek[0].task).toBe('legacy');
    expect(plan.thisWeek[0].why).toBe('old reason');
  });
});

describe('buildAdvisorUserPrompt', () => {
  it('노트 본문과 id가 프롬프트에 포함된다', () => {
    const p = buildAdvisorUserPrompt(DEMO_NOTES);
    expect(p).toContain('[note-01]');
    expect(p).toContain('[note-30]');
  });

  it('추가 노트가 있으면 재분석 지시가 붙는다', () => {
    const p = buildAdvisorUserPrompt(DEMO_NOTES, 'Father called today.');
    expect(p).toContain('Father called today.');
    expect(p).toContain('note-new');
  });
});

describe('DEMO_ADVISOR_PLAN 픽스처 정합성', () => {
  const known = new Set(DEMO_NOTES.map(n => n.id));

  it('인용된 모든 근거 노트가 실존한다 (근거 칩 점프가 깨지지 않도록)', () => {
    const dangling = citedNoteIds(DEMO_ADVISOR_PLAN).filter(id => !known.has(id));
    expect(dangling).toEqual([]);
  });

  it('signals와 주·월·분기 업무 목록이 모두 비어 있지 않다', () => {
    expect(DEMO_ADVISOR_PLAN.signals.length).toBeGreaterThan(0);
    expect(DEMO_ADVISOR_PLAN.thisWeek.length).toBeGreaterThan(0);
    expect(DEMO_ADVISOR_PLAN.thisMonth.length).toBeGreaterThan(0);
    expect(DEMO_ADVISOR_PLAN.thisQuarter.length).toBeGreaterThan(0);
  });

  it('모든 업무가 유효한 NEWTON 가치·담당·기한·근거를 갖는다', () => {
    const all = [...DEMO_ADVISOR_PLAN.thisWeek, ...DEMO_ADVISOR_PLAN.thisMonth, ...DEMO_ADVISOR_PLAN.thisQuarter];
    for (const a of all) {
      expect(NEWTON_VALUES).toContain(a.value);
      expect(a.owner.length).toBeGreaterThan(0);
      expect(a.due.length).toBeGreaterThan(0);
      // why는 이 데모의 핵심 값 — 비어 있으면 신입에게 판단이 전달되지 않는다.
      expect(a.why.length).toBeGreaterThan(20);
    }
  });
});

describe('DEMO_NOTES 픽스처', () => {
  it('노트가 28건 이상이다', () => {
    expect(DEMO_NOTES.length).toBeGreaterThanOrEqual(28);
  });

  it('id가 고유하다', () => {
    expect(new Set(DEMO_NOTES.map(n => n.id)).size).toBe(DEMO_NOTES.length);
  });

  it('created_at이 오름차순이다', () => {
    const times = DEMO_NOTES.map(n => new Date(n.created_at).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('모든 노트에 작성자와 본문이 있다', () => {
    for (const n of DEMO_NOTES) {
      expect(n.author && n.author.length > 0).toBe(true);
      expect(n.raw_memo.length).toBeGreaterThan(40);
    }
  });
});
