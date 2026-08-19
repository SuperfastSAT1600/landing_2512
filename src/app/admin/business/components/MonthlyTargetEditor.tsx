'use client';

import { useState } from 'react';
import { Loader2, Settings2 } from 'lucide-react';
import type { BusinessTargetSegment } from '@/lib/business-targets';

interface Props {
  segment: BusinessTargetSegment;
  adminKey: string;
  onSaved: () => void;
}

const today = () => new Date().toISOString().slice(0, 7); // YYYY-MM

/** 월별 목표 추가·수정 — tutoring/global 모두 원화(KRW) 그대로 입력받아 저장한다. */
export function MonthlyTargetEditor({ segment, adminKey, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [month, setMonth] = useState(today());
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!amount) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/business/monthly-targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ segment, month, target_amount: Number(amount) }),
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
        placeholder="목표 금액 (원)"
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
  );
}
