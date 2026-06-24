'use client';

import { useState, useEffect } from 'react';
import { X, CreditCard, ChevronLeft, Crown } from 'lucide-react';
import { Student, ProductCategory, ProductSubcategory, B2B_PARTNER_OPTIONS } from '@/types/crm';
import { detectVipReasons, VIP_REASON_LABELS, VIP_REASON_COLORS, type VipReason } from '@/lib/vip-utils';
import { getAdminUserName } from '@/lib/admin-user';

type ClassType = '1:1' | '1:2' | '그룹' | '콘텐츠';
type Subject = 'SAT' | 'AP';

interface Product {
  id: string;
  label: string;
  requiresHours: boolean;
  category: ProductCategory;
  subcategory: ProductSubcategory;
}

const PRODUCT_TREE: Record<ClassType, Partial<Record<Subject | '_', Product[]>>> = {
  '1:1': {
    SAT: [
      { id: 'sat_1on1_managed',  label: 'SAT 정규 1:1 수업 (관리형)',  requiresHours: true,  category: 'SAT 정규 1:1 수업', subcategory: '관리형 수업' },
      { id: 'sat_1on1_onepoint', label: 'SAT 정규 1:1 수업 (원포인트)', requiresHours: true,  category: 'SAT 정규 1:1 수업', subcategory: '원포인트' },
      { id: 'sat_trial',         label: 'SAT 체험 1:1 수업',            requiresHours: false, category: 'SAT 체험 1:1 수업', subcategory: '체험수업' },
    ],
    AP: [
      { id: 'ap_1on1', label: 'AP 정규 1:1 수업', requiresHours: true, category: 'AP 정규 1:1 수업', subcategory: '관리형 수업' },
    ],
  },
  '1:2': {
    SAT: [
      { id: 'sat_1on2_managed',  label: 'SAT 정규 1:2 수업 (관리형)',  requiresHours: true,  category: 'SAT 정규 1:2 수업', subcategory: '관리형 수업' },
      { id: 'sat_1on2_onepoint', label: 'SAT 정규 1:2 수업 (원포인트)', requiresHours: true,  category: 'SAT 정규 1:2 수업', subcategory: '원포인트' },
      { id: 'sat_trial_1on2',    label: 'SAT 체험 1:2 수업',            requiresHours: false, category: 'SAT 체험 1:2 수업', subcategory: '체험수업' },
    ],
    AP: [
      { id: 'ap_1on2', label: 'AP 정규 1:2 수업', requiresHours: true, category: 'AP 정규 1:2 수업', subcategory: '관리형 수업' },
    ],
  },
  '그룹': {
    SAT: [
      { id: 'sat_group', label: 'SAT 정규 그룹 수업 (여름방학 특강)', requiresHours: false, category: 'SAT 정규 그룹 수업', subcategory: '여름방학 특강' },
    ],
  },
  '콘텐츠': {
    _: [
      { id: 'content_vocab',     label: '단어학습',   requiresHours: false, category: '관리형 콘텐츠', subcategory: '단어학습' },
      { id: 'content_supertest', label: 'SuperTest', requiresHours: false, category: '관리형 콘텐츠', subcategory: 'SuperTest' },
      { id: 'content_lecture',   label: '인강',       requiresHours: false, category: '관리형 콘텐츠', subcategory: '인강' },
    ],
  },
};

interface PaymentModalProps {
  student: Student;
  adminKey: string;
  onConfirm: (updatedStudent: Student) => void;
  onClose: () => void;
}

type PaymentType = '최초결제' | '재결제';

// B2B 학생이고 b2b_partner가 미설정인 경우 파트너 선택이 필요한지
function needsPartnerSelection(student: Student) {
  return student.lead_type === 'B2B' && !student.b2b_partner;
}

export function PaymentModal({ student, adminKey, onConfirm, onClose }: PaymentModalProps) {
  const [step, setStep] = useState<-1 | 0 | 1 | 2 | 3>(needsPartnerSelection(student) ? -1 : 0);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(student.b2b_partner ?? null);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [classType, setClassType] = useState<ClassType | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [productId, setProductId] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [taxType, setTaxType] = useState<'면세' | '과세'>('면세');
  const [detectedReasons, setDetectedReasons] = useState<VipReason[]>([]);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reasons = detectVipReasons(student);
    setDetectedReasons(reasons);
    setIsVip(reasons.length > 0);
  }, [student]);

  function getProducts(): Product[] {
    if (!classType) return [];
    if (classType === '콘텐츠') return PRODUCT_TREE['콘텐츠']._ ?? [];
    if (!subject) return [];
    return (PRODUCT_TREE[classType] as Record<Subject, Product[]>)[subject] ?? [];
  }

  const products = getProducts();
  const selectedProduct = products.find(p => p.id === productId);

  const isValid =
    !!selectedProduct &&
    (!selectedProduct.requiresHours || (hours !== '' && Number(hours) > 0)) &&
    amount !== '' && Number(amount) > 0;

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

  async function handleConfirm() {
    if (!isValid || !selectedProduct) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/students/${student.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          product: selectedProduct.label,
          product_category: selectedProduct.category,
          product_subcategory: selectedProduct.subcategory,
          hours: selectedProduct.requiresHours ? Number(hours) : null,
          amount: Number(amount),
          tax_type: taxType,
          payment_type: paymentType ?? '최초결제',
          is_vip: isVip,
          created_by: getAdminUserName(),
          b2b_partner: selectedPartner ?? undefined,
        }),
      });
      const responseBody = await res.json();
      if (!res.ok) {
        throw new Error(responseBody.error ?? '결제 처리 실패');
      }
      onConfirm(responseBody.data.student);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const stepLabel = step === -1 ? '파트너 선택' : step === 0 ? '결제 유형' : step === 1 ? '수업 유형' : step === 2 ? '과목' : '상품 선택';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={handleBack} className="mr-1 text-gray-400 hover:text-gray-600">
                <ChevronLeft size={16} />
              </button>
            )}
            <CreditCard size={16} className="text-blue-500" />
            <h2 className="text-sm font-bold text-gray-900">결제 완료 처리</h2>
            <span className="text-xs text-gray-400 font-normal">· {stepLabel}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-5 pt-3 gap-1">
          {(needsPartnerSelection(student) ? [-1, 0, 1, 2, 3] : [0, 1, 2, 3]).map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-blue-500' : 'bg-gray-100'
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
            <span><span className="font-semibold text-gray-800">{student.name}</span> 학생</span>
            {selectedPartner && step >= 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {selectedPartner}
              </span>
            )}
            {paymentType && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {paymentType}
              </span>
            )}
          </p>

          {/* Step -1: 파트너 선택 (B2B 학생이고 파트너 미설정 시) */}
          {step === -1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">연결할 파트너를 선택하세요</p>
              <div className="grid grid-cols-2 gap-1.5">
                {B2B_PARTNER_OPTIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => { setSelectedPartner(p); setStep(0); }}
                    className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 0: 결제 유형 (최초/재결제) */}
          {step === 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">결제 유형을 선택하세요</p>
              {(['최초결제', '재결제'] as PaymentType[]).map(pt => (
                <button
                  key={pt}
                  onClick={() => { setPaymentType(pt); setStep(1); }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left flex items-center justify-between"
                >
                  <span>{pt}</span>
                  <span className="text-xs text-gray-400">
                    {pt === '최초결제' ? '이 학생의 첫 결제' : '기존 학생의 추가 결제'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: 수업 유형 */}
          {step === 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">수업 유형을 선택하세요</p>
              {(['1:1', '1:2', '그룹', '콘텐츠'] as ClassType[]).map(ct => (
                <button
                  key={ct}
                  onClick={() => handleClassType(ct)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left flex items-center justify-between"
                >
                  <span>
                    {ct === '1:1' && '1:1 수업'}
                    {ct === '1:2' && '1:2 수업'}
                    {ct === '그룹' && '그룹 수업'}
                    {ct === '콘텐츠' && '콘텐츠'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {ct === '1:1' && 'SAT · AP'}
                    {ct === '1:2' && 'SAT · AP'}
                    {ct === '그룹' && 'SAT'}
                    {ct === '콘텐츠' && '단어학습 · SuperTest · 인강'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: 과목 */}
          {step === 2 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">과목을 선택하세요</p>
              {(['SAT', 'AP'] as Subject[]).map(s => {
                const available = classType ? Object.keys(PRODUCT_TREE[classType]).includes(s) : false;
                return (
                  <button
                    key={s}
                    onClick={() => available && handleSubject(s)}
                    disabled={!available}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-colors text-left ${
                      available
                        ? 'border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
                        : 'border-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {s}
                    {!available && <span className="ml-2 text-[11px]">(준비 중)</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 3: 상품 선택 + 결제 정보 */}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">상품을 선택하세요</p>
                {products.map(p => {
                  const isSelected = productId === p.id;
                  return (
                    <div key={p.id}>
                      <button
                        onClick={() => {
                          setProductId(isSelected ? '' : p.id);
                          setHours('');
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors text-left flex items-center gap-3 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-400 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                              <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <span className="flex-1">{p.label}</span>
                        {p.requiresHours && !isSelected && (
                          <span className="text-[10px] text-gray-400">시간 입력</span>
                        )}
                      </button>
                      {/* 시간 입력 — 선택 즉시 노출 */}
                      {isSelected && p.requiresHours && (
                        <div className="mt-1.5 ml-7 flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={hours}
                            onChange={e => setHours(e.target.value)}
                            placeholder="시간 수"
                            autoFocus
                            className="w-24 px-3 py-1.5 rounded-lg border border-blue-200 text-xs focus:outline-none focus:border-blue-400 bg-blue-50"
                          />
                          <span className="text-xs text-gray-400">시간</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 결제 금액 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">결제 금액</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">₩</span>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="예: 2990000"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
                {amount && Number(amount) > 0 && (
                  <p className="text-[11px] text-gray-400">{Number(amount).toLocaleString('ko-KR')}원</p>
                )}
              </div>

              {/* 세금 유형 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">세금 유형</label>
                <div className="flex gap-2">
                  {(['면세', '과세'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTaxType(t)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                        taxType === t
                          ? 'bg-blue-50 border-blue-400 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {amount && Number(amount) > 0 && (
                  <p className="text-[11px] text-gray-400">
                    수익:{' '}
                    <span className="font-medium text-gray-700">
                      {taxType === '면세'
                        ? Number(amount).toLocaleString('ko-KR')
                        : Math.round(Number(amount) * 0.9).toLocaleString('ko-KR')}원
                    </span>
                    {taxType === '과세' && <span className="ml-1 text-gray-400">(부가세 10% 제외)</span>}
                  </p>
                )}
              </div>

              {/* VIP 여부 */}
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
                  <div
                    onClick={() => setIsVip(v => !v)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isVip ? 'bg-amber-400 border-amber-400' : 'border-gray-300 hover:border-amber-300'
                    }`}
                  >
                    {isVip && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${isVip ? 'text-amber-600' : 'text-gray-500'}`}>
                    VIP 학생
                  </span>
                  {isVip && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold tracking-wide">
                      <Crown size={9} />VIP
                    </span>
                  )}
                </label>
                {detectedReasons.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pl-7">
                    <span className="text-[10px] text-gray-400">자동 감지</span>
                    {detectedReasons.map(reason => (
                      <span
                        key={reason}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${VIP_REASON_COLORS[reason]}`}
                      >
                        {VIP_REASON_LABELS[reason]}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        {step === 3 && (
          <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid || loading}
              className="flex-1 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '처리 중...' : '결제 완료'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
