import type { WeeklyPlanSegment } from '@/types/crm';

/** 트랙 추가 시 이름을 한 번에 채우는 상용 이름 — 주차 계획 문서에서 매주 반복되는 것들. */
export const WEEKLY_TRACK_PRESETS: Record<WeeklyPlanSegment, string[]> = {
  b2c: ['신규리드', '이탈 리드 캠페인', '재결제', '기타'],
  b2b: ['소프트웨어 판매', '학생 소개', '기타'],
};

export const SEGMENT_LABELS: Record<WeeklyPlanSegment, string> = { b2c: 'B2C', b2b: 'B2B' };
