import { describe, it, expect } from 'vitest';
import { isContactedWithImpliedPartner, isContacted, CONTACT_IMPLIED_PARTNERS } from '@/lib/crm-stats-core';

// 퍼널 1단계 = 컨택 성공 아님(2단계 이력 없음)
const funnel1 = { funnel_stage: '1', stage_history: [{ stage: '1', label: '문의', entered_at: '2026-06-01' }] };
// 퍼널 2단계 도달 이력 = 컨택 성공
const funnel2 = { funnel_stage: '2', stage_history: [{ stage: '2', label: '콜예약', entered_at: '2026-06-01' }] };

describe('isContactedWithImpliedPartner', () => {
  it('공부하는 아이들 소속 + 1단계 → 컨택 성공으로 간주', () => {
    expect(isContacted(funnel1)).toBe(false); // 기존 로직으론 미컨택
    expect(isContactedWithImpliedPartner(funnel1, '공부하는 아이들')).toBe(true);
  });

  it('일반 파트너 + 1단계 → 기존대로 미컨택', () => {
    expect(isContactedWithImpliedPartner(funnel1, '다른 파트너')).toBe(false);
  });

  it('일반 파트너 + 2단계 → 컨택 성공(기존 로직)', () => {
    expect(isContactedWithImpliedPartner(funnel2, '다른 파트너')).toBe(true);
  });

  it('파트너명 없음(B2C) → 기존 isContacted 그대로', () => {
    expect(isContactedWithImpliedPartner(funnel1, null)).toBe(false);
    expect(isContactedWithImpliedPartner(funnel2, undefined)).toBe(true);
  });

  it('공부하는 아이들은 기본 imply 목록에 포함', () => {
    expect(CONTACT_IMPLIED_PARTNERS.has('공부하는 아이들')).toBe(true);
  });
});
