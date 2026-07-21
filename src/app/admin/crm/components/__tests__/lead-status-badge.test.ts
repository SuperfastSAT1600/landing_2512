import { describe, it, expect } from 'vitest';
import { leadStatus } from '../StatsDetailModal';

// 리드 세부 내역 상태 뱃지 판정 — 3-상태(세일즈 중/결제/이탈)
describe('leadStatus — 상태 뱃지 판정', () => {
  const base = { lead_status: 'active', funnel_stage: '1', is_paid: false };

  it('inactive → 이탈', () => {
    expect(leadStatus({ ...base, lead_status: 'inactive' })).toBe('이탈');
  });

  it('funnel_stage churned → 이탈', () => {
    expect(leadStatus({ ...base, funnel_stage: 'churned' })).toBe('이탈');
  });

  it('기간 내 최초결제(is_paid) → 결제', () => {
    expect(leadStatus({ ...base, is_paid: true })).toBe('결제');
  });

  // 정연후 케이스: 등록(수강 중)했지만 결제일이 조회 기간 창을 벗어나 is_paid=false여도 결제로 본다
  it('lead_status=enrolled 는 is_paid=false 여도 결제', () => {
    expect(leadStatus({ lead_status: 'enrolled', funnel_stage: '8', is_paid: false })).toBe('결제');
  });

  it('funnel_stage=8(수업 중) 은 결제', () => {
    expect(leadStatus({ ...base, funnel_stage: '8' })).toBe('결제');
  });

  it('그 외 활성 리드 → 세일즈 중', () => {
    expect(leadStatus(base)).toBe('세일즈 중');
    expect(leadStatus({ ...base, lead_status: 'reactivating' })).toBe('세일즈 중');
  });

  it('이탈이 결제보다 우선(enrolled+inactive 모순 시 이탈)', () => {
    expect(leadStatus({ lead_status: 'inactive', funnel_stage: '8', is_paid: true })).toBe('이탈');
  });
});
