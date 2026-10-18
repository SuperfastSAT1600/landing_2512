import { describe, it, expect } from 'vitest';
import { getCellState, cellBg, emptyLabel } from '../cell-style';

describe('getCellState', () => {
  it('스케줄 있고 활동 있으면 done', () => {
    expect(getCellState(true, true)).toBe('done');
  });

  it('스케줄 있는데 활동 없으면 missed', () => {
    expect(getCellState(true, false)).toBe('missed');
  });

  it('스케줄 없으면 활동과 무관하게 none', () => {
    expect(getCellState(false, false)).toBe('none');
    expect(getCellState(false, true)).toBe('none');
  });
});

describe('cellBg', () => {
  it('상태별 배경 클래스', () => {
    expect(cellBg(true, true)).toContain('bg-emerald-50');
    expect(cellBg(true, false)).toContain('bg-red-50');
    expect(cellBg(false, false)).toContain('bg-gray-100');
  });

  it('스케줄 없는데 활동이 있으면 배경 없이 숫자만 보인다', () => {
    expect(cellBg(false, true)).toBe('');
  });
});

describe('emptyLabel', () => {
  it('스케줄 없으면 "없음", 있으면 "-"', () => {
    expect(emptyLabel(false)).toEqual({ text: '없음', className: 'text-gray-500' });
    expect(emptyLabel(true)).toEqual({ text: '-', className: 'text-red-400 font-medium' });
  });
});
