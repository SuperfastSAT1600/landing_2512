/**
 * 코퍼스 행의 모양과 집계 (REQ-001, REQ-105).
 *
 * `select-calls.ts`(어떤 통화가 학습에 들어가는가)와 `corpus-row.ts`(학생이 어떻게 행이
 * 되는가)가 함께 쓰는 것만 둔다. 두 파일이 서로를 import하지 않도록 공유물은 여기 모은다.
 */
import type { CallKind } from './classify-call';

export interface StudentInput {
  id: string;
  name: string;
  funnel_stage: string;
  funnel_stage_updated_at: string | null;
  stage_history: Array<{ stage: string; label: string; entered_at: string }> | null;
  grade: string | null;
  school_type: string | null;
  desired_subjects: string | null;
  target_score: number | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
}

export interface CallInput {
  student_id: string;
  source: 'plaud' | 'voip';
  /** 상담자가 붙인 녹음 이름. 통화 종류를 알려주는 유일한 신호다 (REQ-103). */
  recording_name: string | null;
  recorded_at: string | null;
  created_at: string;
  duration_sec: number | null;
  transcript: string;
}

export type Outcome = 'converted' | 'lost';

/** dataset 컬럼과 1:1. 중첩 없이 평면 — 어느 컬럼이 텍스트고 어느 것이 라벨인지는 pack이 정한다. */
export interface CorpusRow {
  student_id: string;
  transcript: string;
  outcome: Outcome;
  grade: string | null;
  school_type: string | null;
  desired_subjects: string | null;
  target_score: number | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
  call_count: number;
  total_duration_sec: number;
}

/**
 * 컬럼 이름의 유일한 목록. example 변환과 코퍼스 다이제스트가 같은 순서를 봐야
 * 같은 내용에 같은 멱등키가 나온다 (REQ-204).
 */
export const CORPUS_COLUMNS: readonly (keyof CorpusRow)[] = [
  'student_id',
  'transcript',
  'outcome',
  'grade',
  'school_type',
  'desired_subjects',
  'target_score',
  'previous_rw_score',
  'previous_math_score',
  'call_count',
  'total_duration_sec',
];

export interface BuildStats {
  students: number;
  rows: number;
  converted: number;
  lost: number;
  /** 아직 결과가 확정되지 않아 제외된 학생. */
  excludedNoLabel: number;
  /** 전사가 한 건도 없는 학생. */
  excludedNoTranscript: number;
  /** 통화가 전부 세일즈 콜이 아니어서 제외된 학생. */
  excludedAllFiltered: number;
  /** 통화가 전부 결과 확정 이후라 잘려나간 학생. */
  excludedAllTruncated: number;
  /** 절단 근거가 없어 누출 위험을 안고 통과시킨 학생. 0이 아니면 확인이 필요하다. */
  cutoffUnavailable: number;
  redactions: number;
  /** 대상 학생이 보유한 통화 전량. 아래 넷의 합과 같다. */
  callsTotal: number;
  duplicateCalls: number;
  callsFiltered: number;
  callsTruncated: number;
  callsKept: number;
  callsByKind: Record<CallKind, number>;
}

/** 결제 완료(수업 중) / 이탈. 그 외 단계는 아직 결과가 아니다. */
export const OUTCOME_BY_STAGE: Record<string, Outcome> = { '8': 'converted', churned: 'lost' };

/** 통화가 일어난 시각. 녹음 시각이 없으면 저장 시각으로 폴백한다. */
export const at = (call: CallInput): number =>
  new Date(call.recorded_at ?? call.created_at).getTime();

export function emptyStats(students: number): BuildStats {
  return {
    students,
    rows: 0,
    converted: 0,
    lost: 0,
    excludedNoLabel: 0,
    excludedNoTranscript: 0,
    excludedAllFiltered: 0,
    excludedAllTruncated: 0,
    cutoffUnavailable: 0,
    redactions: 0,
    callsTotal: 0,
    duplicateCalls: 0,
    callsFiltered: 0,
    callsTruncated: 0,
    callsKept: 0,
    callsByKind: { new_sales: 0, renewal: 0, winback: 0, ops: 0, unknown: 0 },
  };
}
