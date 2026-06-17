import { describe, it, expect } from 'vitest';
import {
  SOURCE_GROUP_MAP,
  getMarketingGroup,
  MARKETING_GROUPS,
  PAID_GROUPS,
} from '@/lib/marketing-groups';
import type { TrafficSource } from '@/types/crm';

const ALL_SOURCES: TrafficSource[] = [
  '네이버 검색 후 상담예약', '구글폼에서 즉시상담', '네이버 카페',
  '(구)랜딩페이지 즉시상담', '(구)랜딩페이지 상담예약',
  '튜터링 랜딩페이지', '공식 블로그', '브런치', '레딧',
  '인스타그램 오가닉', '인스타그램 광고',
  '소개/추천', '책', '기존DB', '대표전화',
  'B2B 파트너',
];

describe('SOURCE_GROUP_MAP', () => {
  it('maps all TrafficSource values', () => {
    for (const src of ALL_SOURCES) {
      expect(SOURCE_GROUP_MAP[src], `${src} should be mapped`).toBeDefined();
    }
  });

  it('maps 네이버 검색 후 상담예약 and 구글폼에서 즉시상담 to 네이버 SEO', () => {
    expect(SOURCE_GROUP_MAP['네이버 검색 후 상담예약']).toBe('네이버 SEO');
    expect(SOURCE_GROUP_MAP['구글폼에서 즉시상담']).toBe('네이버 SEO');
    expect(SOURCE_GROUP_MAP['네이버 카페']).toBe('네이버 SEO');
  });

  it('maps google sources to 구글 SEO', () => {
    const googleSources: TrafficSource[] = [
      '(구)랜딩페이지 즉시상담', '(구)랜딩페이지 상담예약',
      '튜터링 랜딩페이지', '공식 블로그', '브런치', '레딧',
    ];
    for (const src of googleSources) {
      expect(SOURCE_GROUP_MAP[src]).toBe('구글 SEO');
    }
  });

  it('maps instagram sources to META', () => {
    expect(SOURCE_GROUP_MAP['인스타그램 오가닉']).toBe('META');
    expect(SOURCE_GROUP_MAP['인스타그램 광고']).toBe('META');
  });

  it('maps referral sources to 소개', () => {
    expect(SOURCE_GROUP_MAP['소개/추천']).toBe('소개');
    expect(SOURCE_GROUP_MAP['책']).toBe('소개');
  });

  it('maps B2B 파트너 to B2B', () => {
    expect(SOURCE_GROUP_MAP['B2B 파트너']).toBe('B2B');
  });
});

describe('getMarketingGroup', () => {
  it('returns correct group for known source', () => {
    expect(getMarketingGroup('네이버 검색 후 상담예약')).toBe('네이버 SEO');
    expect(getMarketingGroup('인스타그램 광고')).toBe('META');
  });

  it('returns 미분류 for null', () => {
    expect(getMarketingGroup(null)).toBe('미분류');
    expect(getMarketingGroup(undefined)).toBe('미분류');
  });

  it('returns 미분류 for unknown source', () => {
    expect(getMarketingGroup('알수없음')).toBe('미분류');
  });
});

describe('MARKETING_GROUPS', () => {
  it('contains exactly 5 groups', () => {
    expect(MARKETING_GROUPS).toHaveLength(5);
  });

  it('includes all expected group names', () => {
    expect(MARKETING_GROUPS).toContain('네이버 SEO');
    expect(MARKETING_GROUPS).toContain('구글 SEO');
    expect(MARKETING_GROUPS).toContain('META');
    expect(MARKETING_GROUPS).toContain('소개');
    expect(MARKETING_GROUPS).toContain('B2B');
  });
});

describe('PAID_GROUPS', () => {
  it('contains META and 구글 SEO', () => {
    expect(PAID_GROUPS).toContain('META');
    expect(PAID_GROUPS).toContain('구글 SEO');
    expect(PAID_GROUPS).toHaveLength(2);
  });
});
