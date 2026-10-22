import type { Briefing, BriefingEntry } from './classify';
import type { CoachRatio } from './coach-ratio';

export interface PayloadEntry {
  userId: string;
  name: string;
  remainingHours: number;
  isNew: boolean;
  studyHallMinutes: number;
  vocabMinutes: number;
  /** 발송 시각 이후 마지막 스터디홀/보캡 시작 시각 (ISO), 미래 일정이 없으면 null */
  lastDate: string | null;
}

/** 일별로 저장해 직원 페이지에서 다시 보여주는 브리핑 내용 */
export interface BriefingPayload {
  generatedAt: string;
  endingSoon: PayloadEntry[];
  noSchedule: PayloadEntry[];
  neverScheduled: PayloadEntry[];
  coaches: CoachRatio[];
}

const toPayloadEntry = (e: BriefingEntry): PayloadEntry => ({ ...e, lastDate: e.lastDate ? e.lastDate.toISOString() : null });

export function buildBriefingPayload(briefing: Briefing, coaches: CoachRatio[], now: Date): BriefingPayload {
  return {
    generatedAt: now.toISOString(),
    endingSoon: briefing.endingSoon.map(toPayloadEntry),
    noSchedule: briefing.noSchedule.map(toPayloadEntry),
    neverScheduled: briefing.neverScheduled.map(toPayloadEntry),
    coaches,
  };
}
