'use client';

import type { RenewalOutcomeQuality, RenewalTarget, Student } from '@/types/crm';
import { PaymentModal } from '../PaymentModal';
import { RenewalDropModal } from '../RenewalDropModal';
import { RenewalOutcomeModal } from '../RenewalOutcomeModal';
import type { OutcomeInput } from './use-renewal-mutations';

export interface QualityTarget {
  target: RenewalTarget;
  quality: RenewalOutcomeQuality;
}

interface RenewalModalsProps {
  adminKey: string;
  userName?: string;
  payment: { target: RenewalTarget; student: Student } | null;
  onPaymentConfirm: (student: Student, paymentId?: string) => void;
  onPaymentClose: () => void;
  dropTarget: RenewalTarget | null;
  onDropClose: () => void;
  onDropConfirm: (target: RenewalTarget, body: Record<string, unknown>, failMsg: string) => void;
  qualityTarget: QualityTarget | null;
  onQualityClose: () => void;
  onSaveOutcome: (target: RenewalTarget, next: OutcomeInput) => void;
}

/** 결제 / 미전환 사유 / 결과 품질 모달 — 열림 상태는 부모가 소유한다. */
export function RenewalModals({
  adminKey,
  userName,
  payment,
  onPaymentConfirm,
  onPaymentClose,
  dropTarget,
  onDropClose,
  onDropConfirm,
  qualityTarget,
  onQualityClose,
  onSaveOutcome,
}: RenewalModalsProps) {
  return (
    <>
      {payment && (
        <PaymentModal
          student={payment.student}
          adminKey={adminKey}
          onConfirm={onPaymentConfirm}
          onClose={onPaymentClose}
          defaultPaymentType="재결제"
        />
      )}

      {dropTarget && (
        <RenewalDropModal
          target={dropTarget}
          onConfirm={({ quality, reasonTag, reasonNote }) => {
            const target = dropTarget;
            onDropClose();
            onDropConfirm(
              target,
              {
                stage: '5',
                outcome_quality: quality,
                outcome_reason_tag: reasonTag,
                outcome_reason_note: reasonNote,
                author: userName,
              },
              '미전환 처리에 실패했습니다.'
            );
          }}
          onClose={onDropClose}
        />
      )}

      {qualityTarget && (
        <RenewalOutcomeModal
          target={qualityTarget.target}
          initialQuality={qualityTarget.quality}
          onConfirm={(input) => {
            const { target } = qualityTarget;
            onQualityClose();
            onSaveOutcome(target, input);
          }}
          onClear={() => {
            const { target } = qualityTarget;
            onQualityClose();
            onSaveOutcome(target, null);
          }}
          onClose={onQualityClose}
        />
      )}
    </>
  );
}
