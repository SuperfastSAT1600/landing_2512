import { describe, it, expect } from 'vitest';
import { buildEnrollmentUpdate } from '@/lib/enrollment-state';

const AT = '2026-06-15T00:00:00.000Z';

describe('buildEnrollmentUpdate', () => {
  it('항상 enrolled / stage 8 / 갱신시각을 반환', () => {
    const u = buildEnrollmentUpdate([], AT);
    expect(u.lead_status).toBe('enrolled');
    expect(u.funnel_stage).toBe('8');
    expect(u.funnel_stage_updated_at).toBe(AT);
  });

  it('이력이 없으면 stage 8 진입 기록을 추가', () => {
    const u = buildEnrollmentUpdate([], AT);
    expect(u.stage_history).toEqual([{ stage: '8', label: '수업 중', entered_at: AT }]);
  });

  it('기존 이력 뒤에 stage 8을 append', () => {
    const prev = [{ stage: '1', label: '첫 메시지 발송', entered_at: '2026-06-01T00:00:00Z' }];
    const u = buildEnrollmentUpdate(prev, AT);
    expect(u.stage_history).toHaveLength(2);
    expect(u.stage_history[1].stage).toBe('8');
  });

  it('멱등: 이미 stage 8 기록이 있으면 중복 추가하지 않음', () => {
    const prev = [{ stage: '8', label: '수업 중', entered_at: '2026-05-10T00:00:00Z' }];
    const u = buildEnrollmentUpdate(prev, AT);
    expect(u.stage_history).toHaveLength(1);
    expect(u.stage_history[0].entered_at).toBe('2026-05-10T00:00:00Z');
    // 상태 필드는 그대로 보장
    expect(u.lead_status).toBe('enrolled');
    expect(u.funnel_stage).toBe('8');
  });

  it('null/undefined 이력도 안전하게 처리', () => {
    expect(buildEnrollmentUpdate(null, AT).stage_history).toHaveLength(1);
    expect(buildEnrollmentUpdate(undefined, AT).stage_history).toHaveLength(1);
  });
});
