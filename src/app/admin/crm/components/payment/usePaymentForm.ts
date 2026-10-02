import { useState, useEffect } from 'react';
import { Student, B2B_PARTNER_OPTIONS } from '@/types/crm';
import type { PaymentMethod } from '@/types/crm';
import { useCompanies } from '@/hooks/useCompanies';
import { detectVipReasons, type VipReason } from '@/lib/vip-utils';
import { getAdminUserName } from '@/lib/admin-user';
import { apiErrorMessage } from '@/lib/api-error';
import { PaymentRecordedError, retryEnrollment, submitPayment } from './paymentApi';
import { deriveAmount, isPaymentFormValid } from './paymentCalc';
import { getProducts, type ClassType, type PaymentType, type Subject } from './productTree';

type Step = -1 | 0 | 1 | 2 | 3 | 4;

// B2B 학생이고 b2b_partner가 미설정인 경우 파트너 선택이 필요한지
export function needsPartnerSelection(student: Student) {
  return student.lead_type === 'B2B' && !student.b2b_partner;
}

interface UsePaymentFormArgs {
  student: Student;
  adminKey: string;
  onConfirm: (updatedStudent: Student, paymentId?: string) => void;
  onClose: () => void;
  defaultPaymentType?: PaymentType;
}

export function usePaymentForm({ student, adminKey, onConfirm, onClose, defaultPaymentType }: UsePaymentFormArgs) {
  const { companies } = useCompanies(adminKey);
  // 동적 업체명(있으면) 우선, 없으면 정적 목록 폴백
  const partnerOptions = companies.length > 0 ? companies.map(c => c.name) : [...B2B_PARTNER_OPTIONS];
  // 결제 종류가 이미 확정된 진입점(재결제 칸반)은 0단계(결제 유형)를 건너뛴다.
  const [step, setStep] = useState<Step>(
    needsPartnerSelection(student) ? -1 : defaultPaymentType ? 1 : 0
  );
  const [selectedPartner, setSelectedPartner] = useState<string | null>(student.b2b_partner ?? null);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(defaultPaymentType ?? null);
  const [classType, setClassType] = useState<ClassType | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [productId, setProductId] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [taxType, setTaxType] = useState<'면세' | '과세'>('면세');
  // 선택 입력 — 안 고르면 보내지 않아 NULL("기록되지 않음")로 남는다.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [detectedReasons, setDetectedReasons] = useState<VipReason[]>([]);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 결제는 저장됐지만 수업 중 전환만 실패한 상태 — 이후엔 결제를 다시 보내지 않고 전환만 재시도한다.
  const [recorded, setRecorded] = useState<{ paymentId: string | undefined } | null>(null);
  // Step 4 — post-payment tutoring signup link.
  const [signupUrl, setSignupUrl] = useState<string | null>(null);
  const [completedStudent, setCompletedStudent] = useState<Student | null>(null);
  const [completedPaymentId, setCompletedPaymentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const reasons = detectVipReasons(student);
    setDetectedReasons(reasons);
    setIsVip(reasons.length > 0);
  }, [student]);

  const products = getProducts(classType, subject);
  const selectedProduct = products.find(p => p.id === productId);
  const { amountValue, hasAmount, isProvisional } = deriveAmount(amount);
  const isValid = isPaymentFormValid(selectedProduct, hours, hasAmount);

  function selectPartner(p: string) {
    setSelectedPartner(p);
    setStep(0);
  }

  function selectPaymentType(pt: PaymentType) {
    setPaymentType(pt);
    setStep(1);
  }

  function handleClassType(ct: ClassType) {
    setClassType(ct);
    setSubject(null);
    setProductId('');
    setHours('');
    if (ct === '콘텐츠') setStep(3);
    else setStep(2);
  }

  function handleSubject(s: Subject) {
    setSubject(s);
    setProductId('');
    setHours('');
    setStep(3);
  }

  function toggleProduct(id: string) {
    setProductId(productId === id ? '' : id);
    setHours('');
  }

  function handleBack() {
    if (step === 0) {
      if (needsPartnerSelection(student)) setStep(-1);
      return;
    }
    if (step === 1) {
      setStep(0);
      return;
    }
    if (step === 3 && classType !== '콘텐츠') {
      setStep(2);
      setProductId('');
      setHours('');
    } else {
      setStep(1);
      setClassType(null);
      setSubject(null);
      setProductId('');
      setHours('');
    }
  }

  /** 가입 링크를 발급해 4단계로 넘어간다. 결제는 이미 저장됐으므로 실패해도 모달을 막지 않는다. */
  async function revealSignupLink() {
    try {
      const linkRes = await fetch(`/api/crm/students/${student.id}/signup-token`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const linkBody = await linkRes.json();
      if (!linkRes.ok) throw new Error(apiErrorMessage(linkBody, '가입 링크 생성 실패'));
      setSignupUrl(linkBody.signup_url);
      setStep(4);
    } catch (err) {
      // Payment is already recorded — don't trap the user. Surface the error
      // and let them close; the link can be re-issued from the student panel.
      setError(err instanceof Error ? err.message : '가입 링크 생성에 실패했습니다.');
    }
  }

  async function handleConfirm() {
    if (!isValid || !selectedProduct) return;
    setLoading(true);
    setError(null);
    try {
      const extra = {
        is_vip: isVip,
        ...(selectedPartner ? { b2b_partner: selectedPartner } : {}),
      };
      const { student: updated, paymentId } = recorded
        ? { student: await retryEnrollment(student, adminKey, extra), paymentId: recorded.paymentId }
        : await submitPayment(student.id, adminKey, {
            product: selectedProduct.label,
            product_category: selectedProduct.category,
            product_subcategory: selectedProduct.subcategory,
            hours: selectedProduct.requiresHours ? Number(hours) : null,
            amount: Number(amount),
            tax_type: taxType,
            ...(paymentMethod ? { payment_method: paymentMethod } : {}),
            payment_type: paymentType ?? '최초결제',
            created_by: getAdminUserName(),
            ...extra,
          });
      setRecorded(null);
      setCompletedStudent(updated);
      setCompletedPaymentId(paymentId ?? null);

      // Already onboarded (repeat payment) → close as before. First-time
      // students get the custom tutoring signup link revealed on step 4.
      if (student.signup_done_at) {
        onConfirm(updated, paymentId);
        return;
      }

      await revealSignupLink();
    } catch (err) {
      if (err instanceof PaymentRecordedError) setRecorded({ paymentId: err.paymentId });
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  /** Close from the link step — refresh the payment history (payment is done). */
  function finish() {
    if (completedStudent) onConfirm(completedStudent, completedPaymentId ?? undefined);
    else onClose();
  }

  async function handleCopy() {
    if (!signupUrl) return;
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the link stays selectable in the input.
    }
  }

  return {
    step, partnerOptions, selectedPartner, paymentType, classType, productId, hours, setHours,
    amount, setAmount, taxType, setTaxType, paymentMethod, setPaymentMethod,
    detectedReasons, isVip, setIsVip, loading, error, recorded, signupUrl, copied,
    products, amountValue, hasAmount, isProvisional, isValid,
    selectPartner, selectPaymentType, handleClassType, handleSubject, toggleProduct,
    handleBack, handleConfirm, finish, handleCopy,
  };
}
