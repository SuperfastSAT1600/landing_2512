export const MARKETING_GROUPS = ['네이버 SEO', '구글 SEO', 'META', '소개', 'B2B'] as const;
export type MarketingGroup = typeof MARKETING_GROUPS[number] | '미분류';

export const PAID_GROUPS: MarketingGroup[] = ['META', '구글 SEO'];

export const SOURCE_GROUP_MAP: Record<string, MarketingGroup> = {
  // 네이버 SEO
  '네이버 블로그 메인 페이지 히어로 섹션 카톡 - [B]SuperfastsSAT': '네이버 SEO',
  '네이버 블로그 게시물': '네이버 SEO',
  '네이버 카페': '네이버 SEO',
  // 구글 SEO (랜딩 + 블로그 검색 유입)
  '랜딩 상담 폼 카톡 - SuperfastSAT!': '구글 SEO',
  '랜딩 상담 예약 폼 카톡 - SuperfastSAT!': '구글 SEO',
  '(구) 랜딩 즉시 카톡 상담 - [LD] SuperfastSAT': '구글 SEO',
  '(구) 랜딩 구글폼 상담 예약': '구글 SEO',
  '(신) 랜딩 즉시 카톡 상담 - [T] SuperfastSAT': '구글 SEO',
  '(신) 랜딩 구글폼 상담 예약': '구글 SEO',
  '브런치 카톡 - [BR]SuperfastSAT': '구글 SEO',
  '고스트블로그 메인페이지 카톡 - SuperfastSAT(@공식블로그)': '구글 SEO',
  '고스트블로그 게시물 푸터 카톡 - [BR]SuperfastSAT': '구글 SEO',
  '레딧': '구글 SEO',
  // META
  '인스타그램 오가닉': 'META',
  '인스타그램 광고': 'META',
  // 소개
  '소개': '소개',
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
