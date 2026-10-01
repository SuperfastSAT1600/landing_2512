'use client';

import { useState } from 'react';
import { Loader2, Settings2 } from 'lucide-react';
import { USD_TO_KRW_RATE, type BusinessTargetSegment, type BusinessTargetPaymentType } from '@/lib/business-targets';

interface Props {
  segment: BusinessTargetSegment;
  adminKey: string;
  onSaved: () => void;
}

const today = () => new Date().toISOString().slice(0, 7); // YYYY-MM

const PAYMENT_TYPE_TABS: { key: BusinessTargetPaymentType; label: string }[] = [
  { key: 'all', label: '합산' },
  { key: 'first', label: '최초결제' },
  { key: 're', label: '재결제' },
];

/**
 * 월별 목표 추가·수정.
 * tutoring: 합산/최초결제/재결제 탭으로 payment_type 선택 가능.
 * global: payment_type='all'만 사용 (탭 미표시).
 * 금액은 KRW 입력 저장. global만 $ 입력 → KRW 환산.
 */
export function MonthlyTargetEditor({ segment, adminKey, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [month, setMonth] = useState(today());
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<BusinessTargetPaymentType>('all');
  const [submitting, setSubmitting] = useState(false);

  const isGlobal = segment === 'global';

  async function submit() {
    if (!amount) return;
    setSubmitting(true);
    try {
      const target_amount = isGlobal ? Number(amount) * USD_TO_KRW_RATE : Number(amount);
      const res = await fetch('/api/business/monthly-targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          segment,
          month,
          target_amount,
          payment_type: isGlobal ? 'all' : paymentType,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setAmount('');
        setEditing(false);
        onSaved();
      } else {
        alert(json.error ?? '목표 저장에 실패했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
      >
        <Settings2 size={12} /> 목표 설정
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {/* payment_type 탭 (tutoring만) */}
      {!isGlobal && (
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {PAYMENT_TYPE_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPaymentType(key)}
              className={`px-2.5 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                paymentType === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] text-gray-400" htmlFor="monthly-target-month">월</label>
        <input
          id="monthly-target-month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={isGlobal ? '목표 금액 ($)' : '목표 금액 (원)'}
          className="w-28 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={submitting || !amount}
          className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg flex items-center gap-1"
        >
          {submitting && <Loader2 size={11} className="animate-spin" />} 저장
        </button>
        <button onClick={() => setEditing(false)} className="px-1.5 py-1 text-xs text-gray-500 hover:text-gray-700">
          취소
        </button>
      </div>
    </div>
  );
}
