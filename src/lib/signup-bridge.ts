import type { NextRequest } from 'next/server';

/**
 * Cross-DB signup bridge helpers (CRM ↔ SuperfastSAT platform).
 *
 * Flow: on 결제완료 the CRM issues a per-student `signup_token`. The platform's
 * tutoring signup page calls back here (GET /api/crm/signup/[token]) to fetch
 * the prefill below and, on completion, POSTs .../complete to stamp
 * `signup_done_at`. Every cross-DB call is gated by SIGNUP_BRIDGE_SECRET — the
 * random token alone is not enough.
 */

/** Subset of the platform's RegisterStudentInput the CRM can backfill. */
export interface SignupPrefill {
  studentName: string | null; // → platform firstName (single full name)
  parentPhone: string | null;
  parentTimezone: string | null;
  lastScoreRw: number | null;
  lastScoreMath: number | null;
  lastTestDate: string | null; // YYYY-MM
  targetTestDate: string | null; // YYYY-MM-DD
}

/** The columns this module reads off a `students` row. */
export type StudentPrefillSource = {
  name?: string | null;
  parent_phone?: string | null;
  parent_timezone?: string | null;
  previous_rw_score?: number | null;
  previous_math_score?: number | null;
  previous_test_date?: string | null;
  target_test_date?: string | null;
};

export function mapStudentToPrefill(s: StudentPrefillSource): SignupPrefill {
  return {
    studentName: s.name ?? null,
    parentPhone: s.parent_phone ?? null,
    parentTimezone: s.parent_timezone ?? null,
    lastScoreRw: s.previous_rw_score ?? null,
    lastScoreMath: s.previous_math_score ?? null,
    lastTestDate: s.previous_test_date ?? null,
    targetTestDate: s.target_test_date ?? null,
  };
}

/** Build the platform tutoring signup link from a base origin + token. */
export function buildSignupUrl(base: string, token: string): string {
  return `${base.replace(/\/$/, '')}/signup/tutoring?token=${encodeURIComponent(token)}`;
}

/** Shared-secret gate for the platform→CRM bridge endpoints. Fails closed when
 *  the secret is unset (mirrors the sheets-sync auth pattern). */
export function isBridgeAuthenticated(request: NextRequest): boolean {
  const key = request.headers.get('x-signup-bridge-secret');
  const secret = process.env.SIGNUP_BRIDGE_SECRET;
  if (!secret) {
    console.error('[signup-bridge] SIGNUP_BRIDGE_SECRET not configured');
    return false;
  }
  return key === secret;
}
