'use client';

import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import type { Student, ChurnType } from '@/types/crm';

interface Props {
  student: Student;
  onConfirm: (refundAmount: number, refundReason: string, churnType: ChurnType) => Promise<void>;
  onClose: () => void;
}

export function RefundModal({ student, onConfirm, onClose }: Props) {
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [churnType, setChurnType] = useState<ChurnType>('potential');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parsedAmount = parseInt(refundAmount.replace(/,/g, ''), 10);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0 && refundReason.trim().length > 0;

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, '');
    const num = parseInt(raw, 10);
    setRefundAmount(isNaN(num) ? '' : num.toLocaleString('ko-KR'));
    setError('');
  }

  async function handleConfirm() {
    if (!isValid) {
      setError('환불 금액과 사유를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(parsedAmount, refundReason.trim(), churnType);
    } catch {
      setError('처리 중 오류가 발생했습니다.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-gray-50 rounded-xl border border-gray-200 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <RotateCcw size={16} className="text-orange-400" />
            <h2 className="text-sm font-semibold text-gray-900">환불 처리</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-orange-50 border border-orange-100 px-3 py-2.5">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{student.name}</span> 학생을 환불 처리합니다.
            </p>
            <p className="text-xs text-orange-500 mt-1">환불 기록이 저장되고 수업 중에서 이탈 처리됩니다.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">환불 금액</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₩</span>
              <input
                type="text"
                value={refundAmount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-gray-200 focus:border-blue-500 rounded-lg outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">환불 사유</label>
            <textarea
              rows={3}
              value={refundReason}
              onChange={e => { setRefundReason(e.target.value); setError(''); }}
              placeholder="환불 사유를 입력하세요..."
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 focus:border-blue-500 rounded-lg resize-none outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">이탈 분류</label>
            <div className="flex gap-3">
              {(['potential', 'closed'] as ChurnType[]).map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={type}
                    checked={churnType === type}
                    onChange={() => setChurnType(type)}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-gray-600">
                    {type === 'potential' ? '잠재 복귀 가능' : '완전 종료'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 disabled:opacity-50 rounded-lg transition-colors"
          >
            {submitting ? '처리 중...' : '환불 처리'}
          </button>
        </div>
      </div>
    </div>
  );
}
