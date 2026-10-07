import { describe, it, expect } from 'vitest';
import { appendStageHistory } from '../stage-history';
import type { StageHistoryEntry } from '../enrollment-state';

const AT = '2026-10-01T05:10:48.036Z';
const entry = (stage: string, entered_at = '2026-09-30T00:00:00Z'): StageHistoryEntry => ({
  stage,
  label: `단계 ${stage}`,
  entered_at,
});

describe('appendStageHistory', () => {
  // REQ-001
  it('이력이 비어 있으면 첫 항목을 추가한다', () => {
    expect(appendStageHistory([], '5a', '진단테스트 대기', AT)).toEqual([
      { stage: '5a', label: '진단테스트 대기', entered_at: AT },
    ]);
  });

  it('직전과 다른 단계면 뒤에 추가한다', () => {
    const next = appendStageHistory([entry('4')], '5a', '진단테스트 대기', AT);
    expect(next.map((h) => h.stage)).toEqual(['4', '5a']);
  });

  it('직전과 같은 단계면 이력을 그대로 둔다', () => {
    const history = [entry('4'), entry('5a')];
    const next = appendStageHistory(history, '5a', '진단테스트 대기', AT);
    expect(next).toHaveLength(2);
    expect(next[1].entered_at).toBe('2026-09-30T00:00:00Z'); // 최초 진입 시각 보존
  });

  it('단계가 되돌아오는 경우(5a → 6 → 5a)는 정상 추가한다', () => {
    const history = [entry('5a'), entry('6')];
    const next = appendStageHistory(history, '5a', '진단테스트 대기', AT);
    expect(next.map((h) => h.stage)).toEqual(['5a', '6', '5a']);
  });

  it('null/undefined 이력도 안전하게 처리한다', () => {
    expect(appendStageHistory(null, '2', 'x', AT)).toHaveLength(1);
    expect(appendStageHistory(undefined, '2', 'x', AT)).toHaveLength(1);
  });

  it('입력 배열을 변경하지 않는다', () => {
    const history = [entry('4')];
    appendStageHistory(history, '5a', 'x', AT);
    expect(history).toHaveLength(1);
  });
});
