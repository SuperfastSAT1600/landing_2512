import type { Student } from '@/types/crm';
import { buildEnrollmentUpdate } from '@/lib/enrollment-state';
import { apiErrorCode, apiErrorMessage } from '@/lib/api-error';

/**
 * 결제 행은 저장됐지만 "수업 중" 전환만 실패한 상태.
 * 이때 결제를 다시 보내면 같은 결제가 중복 기록되므로 호출부는 전환만 재시도해야 한다.
 */
export class PaymentRecordedError extends Error {
  constructor(message: string, readonly paymentId: string | undefined) {
    super(message);
    this.name = 'PaymentRecordedError';
  }
}

/** 결제를 기록하고 학생을 "수업 중"으로 전환한다. */
export async function submitPayment(
  studentId: string,
  adminKey: string,
  payload: Record<string, unknown>
): Promise<{ student: Student; paymentId: string | undefined }> {
  const res = await fetch(`/api/crm/students/${studentId}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    if (apiErrorCode(body) === 'ENROLL_FAILED') {
      throw new PaymentRecordedError(apiErrorMessage(body, '수업 중 전환에 실패했습니다.'), body.data?.payment?.id);
    }
    throw new Error(apiErrorMessage(body, '결제 처리 실패'));
  }
  return { student: body.data.student, paymentId: body.data.payment?.id };
}

/**
 * 이미 기록된 결제에 대해 "수업 중" 전환만 다시 시도한다.
 * 단계 이력 추가는 PATCH 라우트가 하므로 stage_history는 보내지 않는다.
 */
export async function retryEnrollment(
  student: Student,
  adminKey: string,
  extra: Record<string, unknown>
): Promise<Student> {
  const { stage_history: _history, ...fields } = buildEnrollmentUpdate(
    student.stage_history,
    new Date().toISOString()
  );
  const res = await fetch(`/api/crm/students/${student.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
    body: JSON.stringify({ ...fields, ...extra }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(apiErrorMessage(body, '수업 중 전환 재시도에 실패했습니다.'));
  return body.data;
}
