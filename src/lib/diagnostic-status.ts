/**
 * "이 학생이 진단테스트를 봤는가" 단일 판정식.
 *
 * 진단 이력이 두 시스템에 나뉘어 있다:
 *  - 현행: diagnostic_test_results (2026-03~) → students.diagnostic_result_id / diagnostic_funnel_stage
 *  - 2025 구 시스템: legacy_diagnostic_results (Firebase 회수분)
 * 구 시스템 id 는 students.diagnostic_result_id 에 넣을 수 없다(현행 결과 테이블로 FK가 걸려 있다).
 * 그래서 "완료 여부"는 이 함수로만 판단하고, 호출부가 각자 조건을 재조립하지 않게 한다.
 */

export interface DiagnosticStatusInput {
  diagnostic_result_id: string | null;
  diagnostic_funnel_stage: number | null;
  /** legacy_diagnostic_results 에서 이 학생에게 이어진 최초 응시일. 없으면 미응시. */
  legacy_diagnostic_taken_at?: string | null;
}

export type DiagnosticSource = 'current' | 'legacy' | null;

/** 4 = 'Report 전달 필요' — 이 단계부터는 응시가 끝났다는 뜻이다(DIAGNOSTIC_FUNNEL_LABELS). */
export const DIAGNOSTIC_FUNNEL_DONE_MIN = 4;

export function hasCurrentDiagnostic(s: DiagnosticStatusInput): boolean {
  return !!s.diagnostic_result_id || (s.diagnostic_funnel_stage ?? 0) >= DIAGNOSTIC_FUNNEL_DONE_MIN;
}

export function hasLegacyDiagnostic(s: DiagnosticStatusInput): boolean {
  return !!s.legacy_diagnostic_taken_at;
}

export function isDiagnosticDone(s: DiagnosticStatusInput): boolean {
  return hasCurrentDiagnostic(s) || hasLegacyDiagnostic(s);
}

/** 현행이 있으면 현행이 우선 — 최신 이력이 판단 근거로 더 낫다. */
export function diagnosticSource(s: DiagnosticStatusInput): DiagnosticSource {
  if (hasCurrentDiagnostic(s)) return 'current';
  if (hasLegacyDiagnostic(s)) return 'legacy';
  return null;
}
