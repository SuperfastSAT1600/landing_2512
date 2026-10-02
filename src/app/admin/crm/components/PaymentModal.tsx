'use client';

import type { Student } from '@/types/crm';
import { usePaymentForm, needsPartnerSelection } from './payment/usePaymentForm';
import type { PaymentType } from './payment/productTree';
import { PaymentModalHeader } from './payment/PaymentModalHeader';
import { PaymentModalFooter } from './payment/PaymentModalFooter';
import { PartnerStep, PaymentTypeStep, ClassTypeStep, SubjectStep } from './payment/SelectionSteps';
import { ProductPicker } from './payment/ProductPicker';
import { PaymentFields } from './payment/PaymentFields';
import { VipField } from './payment/VipField';
import { SignupLinkStep } from './payment/SignupLinkStep';

interface PaymentModalProps {
  student: Student;
  adminKey: string;
  onConfirm: (updatedStudent: Student, paymentId?: string) => void;
  onClose: () => void;
  /** 재결제 세일즈 칸반처럼 결제 종류가 이미 확정된 진입점에서 1단계를 건너뛴다. */
  defaultPaymentType?: PaymentType;
}

export function PaymentModal({ student, adminKey, onConfirm, onClose, defaultPaymentType }: PaymentModalProps) {
  const f = usePaymentForm({ student, adminKey, onConfirm, onClose, defaultPaymentType });
  const { step } = f;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <PaymentModalHeader
          step={step}
          hasPartnerStep={needsPartnerSelection(student)}
          onBack={f.handleBack}
          onClose={onClose}
          onFinish={f.finish}
        />

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
            <span><span className="font-semibold text-gray-800">{student.name}</span> 학생</span>
            {f.selectedPartner && step >= 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {f.selectedPartner}
              </span>
            )}
            {f.paymentType && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {f.paymentType}
              </span>
            )}
          </p>

          {step === -1 && <PartnerStep partnerOptions={f.partnerOptions} onSelect={f.selectPartner} />}
          {step === 0 && <PaymentTypeStep onSelect={f.selectPaymentType} />}
          {step === 1 && <ClassTypeStep onSelect={f.handleClassType} />}
          {step === 2 && <SubjectStep classType={f.classType} onSelect={f.handleSubject} />}

          {/* Step 3: 상품 선택 + 결제 정보 */}
          {step === 3 && (
            <>
              <ProductPicker
                products={f.products}
                productId={f.productId}
                hours={f.hours}
                setHours={f.setHours}
                onToggle={f.toggleProduct}
              />
              <PaymentFields
                amount={f.amount}
                setAmount={f.setAmount}
                hasAmount={f.hasAmount}
                isProvisional={f.isProvisional}
                amountValue={f.amountValue}
                taxType={f.taxType}
                setTaxType={f.setTaxType}
                paymentMethod={f.paymentMethod}
                setPaymentMethod={f.setPaymentMethod}
              />
              <VipField isVip={f.isVip} setIsVip={f.setIsVip} detectedReasons={f.detectedReasons} />

              {f.error && <p className="text-xs text-red-500">{f.error}</p>}
            </>
          )}

          {step === 4 && (
            <SignupLinkStep
              studentName={student.name}
              signupUrl={f.signupUrl}
              copied={f.copied}
              onCopy={f.handleCopy}
            />
          )}
        </div>

        <PaymentModalFooter
          step={step}
          isValid={f.isValid}
          loading={f.loading}
          recorded={!!f.recorded}
          onClose={onClose}
          onConfirm={f.handleConfirm}
          onFinish={f.finish}
        />
      </div>
    </div>
  );
}
