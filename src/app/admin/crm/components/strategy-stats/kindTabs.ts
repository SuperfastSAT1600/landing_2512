import type { StrategyHistoryType } from '@/types/crm';

/**
 * 세일즈 로직 통계에 띄우는 kind 탭.
 *
 * `retry`(재시도 세일즈 전략)는 뺀다 — 운영에서 이 통계를 보지 않는다.
 * kind 자체를 없애는 게 아니라 통계 탭만 닫는 것이다. 재시도 전략은 전략 라이브러리·
 * 재시도 칸반·학생 패널 전략 히스토리에서 계속 쓰인다.
 */
export const STATS_KIND_TABS: StrategyHistoryType[] = ['initial_contact', 'initial_sales'];

/** 탭이 없어진 kind로 조회하지 않도록, 기본 선택은 항상 탭 목록 안에서 고른다. */
export const DEFAULT_STATS_KIND: StrategyHistoryType = 'initial_sales';
