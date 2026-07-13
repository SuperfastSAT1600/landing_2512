/**
 * 대표 코치(Lead Coach) slug 큐레이션 목록.
 * 프리미엄 "대표 코치와의 수업권" 상품에서 프로필을 노출할 코치들이며,
 * 노출 순서는 이 배열 순서를 따른다. 프로필은 기존 /coaches/{slug} 페이지를 재사용한다.
 */
export const LEAD_COACH_SLUGS = [
  'ben',
  'chris',
  'julie',
  'laura',
  'lina',
  'siwonpark',
] as const;

export type LeadCoachSlug = (typeof LEAD_COACH_SLUGS)[number];

/** 프리미엄 카드 모달에 전달되는 대표 코치 최소 프로필 (클라이언트 직렬화용) */
export interface LeadCoachProfile {
  slug: string;
  name: string;
  photo: string;
  subjects: string[];
  bio: string;
}
