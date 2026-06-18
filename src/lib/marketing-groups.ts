export const MARKETING_GROUPS = ['네이버 SEO', '구글 SEO', 'META', '소개', 'B2B'] as const;
export type MarketingGroup = typeof MARKETING_GROUPS[number] | '미분류';

export const PAID_GROUPS: MarketingGroup[] = ['META', '구글 SEO'];

export const SOURCE_GROUP_MAP: Record<string, MarketingGroup> = {
  // 네이버 SEO
  '네이버 검색 후 상담예약': '네이버 SEO',
  '구글폼에서 즉시상담': '네이버 SEO',
  '네이버 카페': '네이버 SEO',
  // 구글 SEO
  '(구)랜딩페이지 즉시상담': '구글 SEO',
  '(구)랜딩페이지 상담예약': '구글 SEO',
  '(신)랜딩 페이지 상담예약': '구글 SEO',
  '공식 블로그': '구글 SEO',
  '브런치': '구글 SEO',
  '레딧': '구글 SEO',
  // META
  '인스타그램 오가닉': 'META',
  '인스타그램 광고': 'META',
  // 소개
  '소개/추천': '소개',
  '책': '소개',
  '기존DB': '소개',
  '대표전화': '소개',
  // B2B
  'B2B 파트너': 'B2B',
};

export function getMarketingGroup(source: string | null | undefined): MarketingGroup {
  if (!source) return '미분류';
  return SOURCE_GROUP_MAP[source] ?? '미분류';
}

export const GROUP_COLORS: Record<MarketingGroup, string> = {
  '네이버 SEO': '#03C75A',
  '구글 SEO': '#4285F4',
  'META': '#0866FF',
  '소개': '#F59E0B',
  'B2B': '#8B5CF6',
  '미분류': '#6B7280',
};

export const GROUP_ICONS: Record<MarketingGroup, string> = {
  '네이버 SEO': 'N',
  '구글 SEO': 'G',
  'META': 'M',
  '소개': '👥',
  'B2B': 'B',
  '미분류': '?',
};
