'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Payment } from '@/types/crm';

export interface PaymentEdits {
  amount: number;
  hours: number | null;
}

interface Props {
  payment: Payment;
  savingType: string | null;
  deleting: boolean;
  onTypeChange: (id: string, newType: string) => void;
  onDelete: (id: string) => void;
  /** 저장 성공 여부를 반환한다. false면 편집 모드를 유지한다. */
  onSave: (id: string, edits: PaymentEdits) => Promise<boolean>;
}

function formatAmount(n: number) {
  return '₩' + n.toLocaleString('ko-KR');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function PaymentHistoryRow({ payment: p, savingType, deleting, onTypeChange, onDelete, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(String(p.amount));
  const [hours, setHours] = useState(p.hours == null ? '' : String(p.hours));

  const isRefund = p.payment_type === '환불';
  const type = p.payment_type ?? '최초결제';
  const typeColor = type === '최초결제'
    ? 'bg-blue-100 text-blue-700'
    : type === '재결제'
    ? 'bg-gray-100 text-gray-500'
    : type === '환불'
    ? 'bg-red-100 text-red-600'
    : 'bg-violet-100 text-violet-700'; // 원포인트

  // 금액 부호 규칙은 API와 동일: 환불은 음수, 그 외는 0 이상.
  const amountValue = Number(amount);
  const amountValid =
    amount.trim() !== '' &&
    Number.isInteger(amountValue) &&
    (isRefund ? amountValue < 0 : amountValue >= 0);
  const hoursValue = hours.trim() === '' ? null : Number(hours);
  const hoursValid = hoursValue === null || (Number.isInteger(hoursValue) && hoursValue > 0);
  const canSave = amountValid && hoursValid && !saving;

  function startEditing() {
    setAmount(String(p.amount));
    setHours(p.hours == null ? '' : String(p.hours));
    setEditing(true);
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const ok = await onSave(p.id, { amount: amountValue, hours: hoursValue });
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {isRefund ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">환불</span>
          ) : (
            <select
              value={type}
              disabled={savingType === p.id}
              onChange={(e) => onTypeChange(p.id, e.target.value)}
              title="결제 유형 (통계 반영) — 변경하려면 선택"
              className={`text-[10px] font-semibold pl-1.5 pr-0.5 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${typeColor} disabled:opacity-50`}
            >
              <option value="최초결제">최초결제</option>
              <option value="재결제">재결제</option>
              {type === '원포인트' && <option value="원포인트">원포인트</option>}
            </select>
          )}
          <span className="text-[11px] text-gray-400">{formatDate(p.paid_at)}</span>
        </div>
        <p className="text-[13px] text-gray-700 font-medium truncate">{p.product}</p>

        {editing ? (
          <div className="mt-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gray-400 w-8" htmlFor={`amount-${p.id}`}>금액</label>
              <input
                id={`amount-${p.id}`}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className={`w-32 px-2 py-1 rounded-lg border text-xs focus:outline-none ${
                  amountValid ? 'border-blue-200 focus:border-blue-400' : 'border-red-300'
                }`}
              />
              <span className="text-[11px] text-gray-400">
                {amountValid ? formatAmount(amountValue) : isRefund ? '음수여야 합니다' : '0 이상 정수'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gray-400 w-8" htmlFor={`hours-${p.id}`}>시간</label>
              <input
                id={`hours-${p.id}`}
                type="number"
                min={1}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="없음"
                className={`w-32 px-2 py-1 rounded-lg border text-xs focus:outline-none ${
                  hoursValid ? 'border-blue-200 focus:border-blue-400' : 'border-red-300'
                }`}
              />
              <span className="text-[11px] text-gray-400">{hoursValid ? '시간' : '1 이상 정수'}</span>
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[13px] font-semibold ${isRefund ? 'text-red-500' : 'text-gray-900'}`}>
              {isRefund ? `-${formatAmount(-p.amount)}` : formatAmount(p.amount)}
            </span>
            {!isRefund && p.amount === 0 && (
              <span
                title="가결제 — 수업 시작, 실입금 전. 입금되면 금액을 수정하세요."
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700"
              >
                가결제
              </span>
            )}
            {!isRefund && <span className="text-[11px] text-gray-400">{p.tax_type}</span>}
            {p.hours && <span className="text-[11px] text-gray-400">{p.hours}시간</span>}
          </div>
        )}

        {p.notes && <p className="text-[11px] text-gray-400 mt-0.5">{p.notes}</p>}
      </div>

      <div className="shrink-0 mt-1 flex items-center gap-1.5">
        {!editing && (
          <button
            onClick={startEditing}
            title="금액·시간 수정"
            className="text-gray-300 hover:text-blue-500 transition-colors"
          >
            <Pencil size={13} />
          </button>
        )}
        <button
          onClick={() => onDelete(p.id)}
          disabled={deleting}
          title="결제 기록 삭제"
          className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
