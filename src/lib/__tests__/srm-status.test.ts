import { describe, it, expect } from 'vitest';
import { SRM_STATUSES, SRM_STATUS_LABEL, isSrmStatus, rollUpSrmStatus } from '../srm-status';

// REQ-001 (crm-srm-status)
describe('srm-status', () => {
  it('SRM 관리 화면과 같은 다섯 상태·라벨', () => {
    expect(SRM_STATUSES).toEqual(['onboarding', 'active', 'paused', 'inactive', 'excluded']);
    expect(SRM_STATUS_LABEL.active).toBe('재원');
    expect(SRM_STATUS_LABEL.paused).toBe('휴원');
    expect(SRM_STATUS_LABEL.inactive).toBe('종료');
  });

  it('알 수 없는 값은 상태가 아니다', () => {
    expect(isSrmStatus('paused')).toBe(true);
    expect(isSrmStatus('foo')).toBe(false);
  });

  it('여러 과목은 SRM 우선순위로 하나로 합친다', () => {
    expect(rollUpSrmStatus(['paused', 'active'])).toBe('active');
    expect(rollUpSrmStatus(['paused', 'inactive'])).toBe('paused');
    expect(rollUpSrmStatus(['excluded', 'paused'])).toBe('excluded');
    expect(rollUpSrmStatus([])).toBeNull();
  });
});
