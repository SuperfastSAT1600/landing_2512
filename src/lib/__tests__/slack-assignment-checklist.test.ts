import { describe, it, expect } from 'vitest';
import {
  ASSIGNMENT_CHANNEL,
  ASSIGNMENT_TASKS,
  isAssignmentRequest,
  buildChecklistBlocks,
  applyToggle,
  type ChecklistBlock,
} from '../slack-assignment-checklist';

const base = { type: 'message', channel: ASSIGNMENT_CHANNEL, ts: '100.1', text: '하예린 코치 배정 필요합니다' };

function checkbox(blocks: ChecklistBlock[]) {
  return blocks.find((b) => b.type === 'actions')!.elements![0];
}

describe('isAssignmentRequest (REQ-001)', () => {
  it('배정 키워드가 있는 최상위 글이면 true', () => {
    expect(isAssignmentRequest(base)).toBe(true);
  });

  it('워크플로가 올린 bot_message 도 허용', () => {
    expect(isAssignmentRequest({ ...base, subtype: 'bot_message', bot_id: 'B1' })).toBe(true);
  });

  it('다른 채널은 false', () => {
    expect(isAssignmentRequest({ ...base, channel: 'C0OTHER' })).toBe(false);
  });

  it('스레드 답글은 false', () => {
    expect(isAssignmentRequest({ ...base, thread_ts: '99.9' })).toBe(false);
  });

  it('배정 키워드가 없으면 false', () => {
    expect(isAssignmentRequest({ ...base, text: '점심 뭐 먹지' })).toBe(false);
  });

  it('수정/삭제 등 다른 서브타입은 false', () => {
    expect(isAssignmentRequest({ ...base, subtype: 'message_changed' })).toBe(false);
  });
});

describe('buildChecklistBlocks (REQ-002)', () => {
  it('9개 항목을 체크 안 된 상태로 만든다', () => {
    const blocks = buildChecklistBlocks({});
    const el = checkbox(blocks);
    expect(el.action_id).toBe('assignment_checklist');
    expect(el.options).toHaveLength(ASSIGNMENT_TASKS.length);
    expect(el.initial_options).toBeUndefined();
    expect(JSON.stringify(blocks)).toContain('0/9');
  });

  it('체크된 항목은 initial_options 와 설명을 가진다', () => {
    const blocks = buildChecklistBlocks({ t1: '✔ 홍길동 10/27 14:03' });
    const el = checkbox(blocks);
    expect(el.initial_options).toHaveLength(1);
    expect(el.initial_options![0].value).toBe('t1');
    expect(el.options![0].description?.text).toBe('✔ 홍길동 10/27 14:03');
    expect(JSON.stringify(blocks)).toContain('1/9');
  });

  it('전부 체크되면 완료 문구가 붙는다', () => {
    const all = Object.fromEntries(ASSIGNMENT_TASKS.map((t) => [t.id, '✔ a']));
    expect(JSON.stringify(buildChecklistBlocks(all))).toContain('배정 업무 완료');
  });
});

describe('applyToggle (REQ-002)', () => {
  const now = new Date('2026-10-27T05:03:00Z'); // KST 14:03

  it('새로 체크된 항목에 사용자와 KST 시각 설명을 붙인다', () => {
    const next = applyToggle({}, ['t1'], '홍길동', now);
    expect(next).toEqual({ t1: '✔ 홍길동 10/27 14:03' });
  });

  it('기존 체크는 설명을 유지한다', () => {
    const prev = { t1: '✔ 김 10/26 09:00' };
    expect(applyToggle(prev, ['t1', 't2'], '홍길동', now).t1).toBe('✔ 김 10/26 09:00');
  });

  it('해제된 항목은 제거한다', () => {
    expect(applyToggle({ t1: '✔ 김 10/26 09:00' }, [], '홍길동', now)).toEqual({});
  });
});
