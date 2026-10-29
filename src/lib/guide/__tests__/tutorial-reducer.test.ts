import { describe, it, expect } from 'vitest';
import { initialState, tutorialReducer } from '../tutorial-reducer';

const TARGETS = ['a', 'b', 'c'];

describe('tutorialReducer (REQ-002)', () => {
  it('올바른 target 클릭 시 다음 스텝으로 진행', () => {
    const s = tutorialReducer(initialState, { type: 'click', targetId: 'a', targets: TARGETS });
    expect(s.index).toBe(1);
    expect(s.done).toBe(false);
    expect(s.missed).toBe(false);
  });

  it('잘못된 영역 클릭은 진행되지 않고 missed 표시', () => {
    const s = tutorialReducer(initialState, { type: 'click', targetId: 'zzz', targets: TARGETS });
    expect(s.index).toBe(0);
    expect(s.missed).toBe(true);
  });

  it('target 이 없는 영역 클릭(null)도 진행되지 않음', () => {
    const s = tutorialReducer(initialState, { type: 'click', targetId: null, targets: TARGETS });
    expect(s.index).toBe(0);
    expect(s.missed).toBe(true);
  });

  it('올바른 클릭 시 이전 missed 가 해제됨', () => {
    const missed = tutorialReducer(initialState, { type: 'click', targetId: 'zzz', targets: TARGETS });
    const s = tutorialReducer(missed, { type: 'click', targetId: 'a', targets: TARGETS });
    expect(s.missed).toBe(false);
  });

  it('마지막 스텝 클릭 시 done', () => {
    let s = initialState;
    for (const id of TARGETS) s = tutorialReducer(s, { type: 'click', targetId: id, targets: TARGETS });
    expect(s.done).toBe(true);
    expect(s.index).toBe(TARGETS.length);
  });

  it('done 이후 클릭은 무시', () => {
    const done = { index: 3, done: true, missed: false };
    const s = tutorialReducer(done, { type: 'click', targetId: 'a', targets: TARGETS });
    expect(s).toEqual(done);
  });

  it('back 은 한 단계 되돌리고 0 아래로 내려가지 않음', () => {
    const s1 = tutorialReducer({ index: 2, done: false, missed: true }, { type: 'back' });
    expect(s1).toEqual({ index: 1, done: false, missed: false });
    expect(tutorialReducer(initialState, { type: 'back' }).index).toBe(0);
  });

  it('done 상태에서 back 하면 마지막 스텝으로 복귀', () => {
    const s = tutorialReducer({ index: 3, done: true, missed: false }, { type: 'back' });
    expect(s).toEqual({ index: 2, done: false, missed: false });
  });

  it('reset 은 초기 상태', () => {
    expect(tutorialReducer({ index: 2, done: true, missed: true }, { type: 'reset' })).toEqual(initialState);
  });
});
