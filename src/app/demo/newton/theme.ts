// Edumo 브랜드 토큰 — 기존 B2B 제안서(TCIS_소프트웨어 B2B 제안서.pdf)에서 추출.
// 데모 페이지는 그 자료의 후속물이므로 색·간격·타이포 톤을 그대로 잇는다.

export const brand = {
  /** 제목·강조 바에 쓰는 딥 네이비 */
  primary: '#040d77',
  /** 보조 강조(카드 위 라벨 등) */
  accent: '#5361ee',
  /** 흐린 보조면 */
  muted: '#6f74b0',
  /** 카드 배경 그레이 */
  card: '#e4e4e4',
  canvas: '#ffffff',
} as const;

/** 섹션 앵커 — 상단 진행 네비와 본문이 공유한다. */
export const SECTIONS = [
  { id: 'intro', label: '소개' },
  { id: 'team', label: '팀' },
  { id: 'console', label: '통합 구조' },
  { id: 'record', label: '학생 기록' },
  { id: 'applications', label: '대학 원서' },
  { id: 'advisor', label: 'AI 업무 목록' },
  { id: 'roadmap', label: '로드맵' },
  { id: 'next', label: '연락처' },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];
