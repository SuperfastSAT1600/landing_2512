/// <reference types="vitest/globals" />
import { STATS_KIND_TABS, DEFAULT_STATS_KIND } from '../strategy-stats/kindTabs';

describe('세일즈 로직 통계 kind 탭', () => {
  it('재시도(retry) 탭은 띄우지 않는다 — 운영에서 안 본다', () => {
    expect(STATS_KIND_TABS).not.toContain('retry');
  });

  it('컨택 → 첫 세일즈 순서로 두 개만 띄운다', () => {
    expect(STATS_KIND_TABS).toEqual(['initial_contact', 'initial_sales']);
  });

  it('기본 선택은 탭 목록 안에 있다 — 없어진 kind로 조회하지 않는다', () => {
    expect(STATS_KIND_TABS).toContain(DEFAULT_STATS_KIND);
  });
});
