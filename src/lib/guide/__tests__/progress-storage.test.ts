import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadCompleted, markCompleted, STORAGE_KEY } from '../progress-storage';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('progress-storage (REQ-004)', () => {
  it('저장된 것이 없으면 빈 배열', () => {
    expect(loadCompleted()).toEqual([]);
  });

  it('완료 미션을 저장하고 복원', () => {
    markCompleted('schedule');
    expect(loadCompleted()).toEqual(['schedule']);
  });

  it('같은 미션을 두 번 저장해도 중복되지 않음', () => {
    markCompleted('schedule');
    markCompleted('schedule');
    expect(loadCompleted()).toEqual(['schedule']);
  });

  it('손상된 JSON 이나 알 수 없는 id 는 무시', () => {
    window.localStorage.setItem(STORAGE_KEY, '{broken');
    expect(loadCompleted()).toEqual([]);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['schedule', 'hacker']));
    expect(loadCompleted()).toEqual(['schedule']);
  });

  it('localStorage 접근이 throw 해도 오류 없이 동작', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadCompleted()).toEqual([]);
    expect(() => markCompleted('schedule')).not.toThrow();
  });
});
