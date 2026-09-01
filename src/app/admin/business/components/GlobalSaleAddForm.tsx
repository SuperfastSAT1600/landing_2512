'use client';

import { useState } from 'react';
import { GLOBAL_SALE_BILLING_TYPES } from '@/lib/global-sales-types';
import type { GlobalSalePaymentType, GlobalSaleBillingType } from '@/lib/global-sales-types';
import { CountryPicker } from './CountryPicker';

export interface NewGlobalSale {
  student_name: string;
  payment_type: GlobalSalePaymentType;
  billing_type: GlobalSaleBillingType;
  amount_usd: number;
  sale_date: string;
  country_code: string | null;
}

interface Props {
  submitting: boolean;
  onSubmit: (sale: NewGlobalSale) => void;
  onCancel: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const FIELD = 'text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none';

export function GlobalSaleAddForm({ submitting, onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [paymentType, setPaymentType] = useState<GlobalSalePaymentType>('최초결제');
  const [billingType, setBillingType] = useState<GlobalSaleBillingType>('일회성');
  const [amount, setAmount] = useState('');
  const [saleDate, setSaleDate] = useState(today());
  const [countryCode, setCountryCode] = useState('');

  function submit() {
    if (!name.trim() || !amount) return;
    onSubmit({
      student_name: name.trim(),
      payment_type: paymentType,
      billing_type: billingType,
      amount_usd: Number(amount),
      sale_date: saleDate,
      country_code: countryCode || null,
    });
    // 국가는 유지 — 같은 국가 건을 연달아 입력하는 경우가 많다.
    setName('');
    setAmount('');
    setPaymentType('최초결제');
    setBillingType('일회성');
    setSaleDate(today());
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="학생 이름"
        className={FIELD}
      />
      <select
        aria-label="유형"
        value={paymentType}
        onChange={(e) => setPaymentType(e.target.value as GlobalSalePaymentType)}
        className={FIELD}
      >
        <option value="최초결제">최초결제</option>
        <option value="재결제">재결제</option>
      </select>
      <select
        aria-label="결제 방식"
        value={billingType}
        onChange={(e) => setBillingType(e.target.value as GlobalSaleBillingType)}
        className={FIELD}
      >
        {GLOBAL_SALE_BILLING_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <CountryPicker
        label="국가"
        value={countryCode || null}
        onChange={(code) => setCountryCode(code ?? '')}
        allowClear
        className={FIELD}
      />
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="금액 ($)"
        className={`w-24 ${FIELD}`}
      />
      <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className={FIELD} />
      <button
        onClick={submit}
        disabled={submitting || !name.trim() || !amount}
        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg"
      >
        추가
      </button>
      <button onClick={onCancel} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700">
        취소
      </button>
    </div>
  );
}
