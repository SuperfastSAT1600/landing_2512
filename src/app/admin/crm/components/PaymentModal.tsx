'use client';

import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { Student, ProductCategory, ProductSubcategory } from '@/types/crm';

interface Product {
  id: string;
  label: string;
  requiresHours: boolean;
  category: ProductCategory;
  subcategory: ProductSubcategory;
}

const PRODUCTS: Product[] = [
  { id: 'sat_1on1_managed',   label: 'SAT 정규 1:1 수업 (관리형)',        requiresHours: true,  category: 'SAT 정규 1:1 수업',    subcategory: '관리형 수업' },
  { id: 'sat_1on1_onepoint',  label: 'SAT 정규 1:1 수업 (원포인트)',       requiresHours: true,  category: 'SAT 정규 1:1 수업',    subcategory: '원포인트' },
  { id: 'sat_trial',          label: 'SAT 체험 1:1 수업',                 requiresHours: false, category: 'SAT 체험 1:1 수업',    subcategory: '체험수업' },
  { id: 'sat_group',          label: 'SAT 정규 그룹 수업 (여름방학 특강)', requiresHours: false, category: 'SAT 정규 그룹 수업',   subcategory: '여름방학 특강' },
  { id: 'ap_1on1',            label: 'AP 정규 1:1 수업',                  requiresHours: true,  category: 'AP 정규 1:1 수업',     subcategory: '관리형 수업' },
  { id: 'content_vocab',      label: '관리형 콘텐츠 — 단어학습',           requiresHours: false, category: '관리형 콘텐츠',         subcategory: '단어학습' },
  { id: 'content_supertest',  label: '관리형 콘텐츠 — SuperTest',         requiresHours: false, category: '관리형 콘텐츠',         subcategory: 'SuperTest' },
  { id: 'content_lecture',    label: '관리형 콘텐츠 — 인강',               requiresHours: false, category: '관리형 콘텐츠',         subcategory: '인강' },
];

interface PaymentModalProps {
  student: Student;
  adminKey: string;
  onConfirm: (updatedStudent: Student) => void;
  onClose: () => void;
}

export function PaymentModal({ student, adminKey, onConfirm, onClose }: PaymentModalProps) {
  const [productId, setProductId] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [taxType, setTaxType] = useState<'면세' | '과세'>('면세');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = PRODUCTS.find(p => p.id === productId);

  const isValid =
    !!selectedProduct &&
    (!selectedProduct.requiresHours || (hours !== '' && Number(hours) > 0)) &&
    amount !== '' && Number(amount) > 0;

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
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? '결제 처리 실패');
      }
      const { data } = await res.json();
      onConfirm(data.student);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-blue-500" />
            <h2 className="text-sm font-bold text-gray-900">결제 완료 처리</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-800">{student.name}</span> 학생의 결제 정보를 입력해주세요.
          </p>

          {/* 상품 선택 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">과목 / 상품군</label>
            <div className="space-y-1.5">
              {PRODUCTS.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setProductId(p.id); setHours(''); }}
                  className={`w-full px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left flex items-center justify-between ${
                    productId === p.id
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span>{p.label}</span>
                  {p.requiresHours && <span className="text-[10px] text-gray-400 font-normal">시간 입력</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 시간 수 입력 */}
          {selectedProduct?.requiresHours && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">수업 시간 수</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  placeholder="예: 20"
                  className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-blue-400"
                />
                <span className="text-xs text-gray-400">시간</span>
              </div>
            </div>
          )}

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
              <p className="text-[11px] text-gray-400">
                {Number(amount).toLocaleString('ko-KR')}원
              </p>
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

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>

        {/* Footer */}
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
      </div>
    </div>
  );
}
