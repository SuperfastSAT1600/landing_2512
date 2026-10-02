'use client';

import { useState } from 'react';
import type { RenewalTarget, Student } from '@/types/crm';

/** 결제는 성공했는데 단계 전환 PATCH가 실패한 상태 — 재시도 대상. */
export interface PendingConversion {
  targetId: string;
  paymentId?: string;
  studentName: string;
}

interface UseRenewalPaymentOptions {
  adminKey: string;
  patchTarget: (id: string, body: Record<string, unknown>) => Promise<void>;
  setError: (message: string | null) => void;
  refresh: () => Promise<void>;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
}

/** 결제 모달 진입 → 결제 확정 → '결제 완료'(4) 단계 전환, 전환 실패 시 재시도 상태. */
export function useRenewalPayment({
  adminKey,
  patchTarget,
  setError,
  refresh,
  onStudentUpdate,
}: UseRenewalPaymentOptions) {
  // PaymentModal은 B2B 파트너·가입 여부까지 보므로 조인된 부분 학생으로는 열 수 없다.
  // 결제 버튼을 누른 순간 전체 학생을 받아온다.
  const [payment, setPayment] = useState<{ target: RenewalTarget; student: Student } | null>(null);
  const [pendingConversion, setPendingConversion] = useState<PendingConversion | null>(null);

  /** 결제는 이미 기록됐다. 단계 전환만 실패하면 재시도로 복구한다(PATCH는 멱등). */
  const convertToPaid = async (targetId: string, paymentId: string | undefined, name: string) => {
    try {
      await patchTarget(targetId, { stage: '4', converted_payment_id: paymentId ?? null });
      setPendingConversion(null);
      await refresh();
    } catch {
      setPendingConversion({ targetId, paymentId, studentName: name });
      setError(`${name} 결제는 기록됐지만 '결제 완료' 단계 이동이 실패했습니다.`);
    }
  };

  /** 결제 모달 진입 — 전체 학생을 받아온 뒤 연다. */
  const openPayment = async (target: RenewalTarget) => {
    try {
      const res = await fetch(`/api/crm/students/${target.student_id}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) throw new Error();
      setPayment({ target, student: json.data as Student });
    } catch {
      setError('학생 정보를 불러오지 못해 결제 창을 열 수 없습니다.');
    }
  };

  const handlePaymentConfirm = async (updatedStudent: Student, paymentId?: string) => {
    if (!payment) return;
    const { target } = payment;
    setPayment(null);
    onStudentUpdate(updatedStudent.id, updatedStudent);
    await convertToPaid(target.id, paymentId, updatedStudent.name);
  };

  return {
    payment,
    closePayment: () => setPayment(null),
    pendingConversion,
    convertToPaid,
    openPayment,
    handlePaymentConfirm,
  };
}
