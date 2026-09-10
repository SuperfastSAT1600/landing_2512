'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  token: string;
  onClose: () => void;
}

const ACCENT = '#6085FF';

export default function ConsultationRequestModal({ token, onClose }: Props) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portal/${token}/consult-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time }),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      console.error('상담 신청 실패');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(9,9,11,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-sm mx-auto rounded-t-3xl sm:rounded-2xl p-6"
        style={{ background: '#fff' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-base" style={{ color: '#09090b' }}>원장님 상담 신청</h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: '#94a3b8' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-4">
            <p className="text-3xl mb-3">✅</p>
            <p className="font-bold text-sm mb-1.5" style={{ color: '#09090b' }}>신청이 완료되었습니다</p>
            <p className="text-xs mb-6" style={{ color: '#64748b' }}>확인 후 연락드리겠습니다.</p>
            <button
              onClick={onClose}
              className="w-full rounded-xl py-3 text-sm font-bold text-white"
              style={{ background: ACCENT }}
            >
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#475569' }}>
                희망 날짜
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                min={today}
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                style={{ border: '1.5px solid #E2E8F0', color: '#09090b', background: '#F8FAFC' }}
                onFocus={e => (e.currentTarget.style.borderColor = ACCENT)}
                onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#475569' }}>
                희망 시간
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                style={{ border: '1.5px solid #E2E8F0', color: '#09090b', background: '#F8FAFC' }}
                onFocus={e => (e.currentTarget.style.borderColor = ACCENT)}
                onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl py-3 text-sm font-semibold transition-colors"
                style={{ background: '#F1F5F9', color: '#475569' }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!date || !time || submitting}
                className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-opacity"
                style={{
                  background: ACCENT,
                  opacity: (!date || !time || submitting) ? 0.5 : 1,
                  cursor: (!date || !time || submitting) ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? '신청 중...' : '신청하기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
