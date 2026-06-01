'use client';

import { useState } from 'react';
import { X, CreditCard } from 'lucide-react';
import { Student } from '@/types/crm';

interface Product {
  id: string;
  label: string;
  requiresHours: boolean;
}

interface Category {
  id: string;
  label: string;
  products: Product[];
}

const PRODUCT_TREE: Category[] = [
  {
    id: 'sat_regular',
    label: 'SAT 정규수업',
    products: [
      { id: 'sat_managed_1on1', label: '관리형 1:1 수업', requiresHours: true },
      { id: 'sat_managed_content', label: '관리형 콘텐츠', requiresHours: false },
      { id: 'sat_unmanaged_package', label: '비관리형 시간 패키지', requiresHours: true },
    ],
  },
  {
    id: 'sat_summer',
    label: 'SAT 여름방학 특강',
    products: [
      { id: 'sat_summer_intensive', label: 'SAT 여름방학 특강', requiresHours: false },
    ],
  },
  {
    id: 'ap_regular',
    label: 'AP 정규수업',
    products: [
      { id: 'ap_managed_1on1', label: '관리형 1:1 수업', requiresHours: true },
    ],
  },
];

interface PaymentModalProps {
  student: Student;
  adminKey: string;
  onConfirm: (updatedStudent: Student) => void;
  onClose: () => void;
}

export function PaymentModal({ student, adminKey, onConfirm, onClose }: PaymentModalProps) {
  const [categoryId, setCategoryId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [taxType, setTaxType] = useState<'면세' | '과세'>('면세');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = PRODUCT_TREE.find(c => c.id === categoryId);
  const selectedProduct = selectedCategory?.products.find(p => p.id === productId);

  const productLabel = selectedCategory && selectedProduct
    ? `${selectedCategory.label} - ${selectedProduct.label}`
    : '';

  const isValid =
    !!selectedProduct &&
    (!selectedProduct.requiresHours || (hours !== '' && Number(hours) > 0)) &&
    amount !== '' && Number(amount) > 0;

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    setProductId('');
    setHours('');
  }

  async function handleConfirm() {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm/students/${student.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          product: productLabel,
          hours: selectedProduct!.requiresHours ? Number(hours) : null,
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

          {/* 카테고리 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">과목 / 상품군</label>
            <div className="grid grid-cols-3 gap-2">
              {PRODUCT_TREE.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left ${
                    categoryId === cat.id
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 상품 선택 */}
          {selectedCategory && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">상품</label>
              <div className="space-y-1.5">
                {selectedCategory.products.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setProductId(p.id); setHours(''); }}
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left ${
                      productId === p.id
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {p.label}
                    {p.requiresHours && <span className="ml-1 text-gray-400">(시간 입력)</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

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
