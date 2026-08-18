'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { PinInput } from './PinInput';

interface Props {
  token: string;
  onClose: () => void;
}

type Step = 'current' | 'new' | 'done';

export default function PasscodeChange({ token, onClose }: Props) {
  const [step, setStep] = useState<Step>('current');
  const [current, setCurrent] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCurrentNext() {
    if (current.length !== 6) return;
    setError('');
    setLoading(true);
    const res = await fetch(`/api/portal/${token}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', passcode: current }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? '현재 비밀번호가 올바르지 않습니다');
      setCurrent('');
      return;
    }
    setStep('new');
  }

  async function handleChange() {
    if (newCode.length !== 6 || confirmCode.length !== 6) return;
    if (newCode !== confirmCode) { setError('새 비밀번호가 일치하지 않습니다'); setConfirmCode(''); return; }
    setError('');
    setLoading(true);
    const res = await fetch(`/api/portal/${token}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'change', currentPasscode: current, newPasscode: newCode }),
    });
    setLoading(false);
    if (res.ok) { setStep('done'); return; }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? '변경에 실패했습니다');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 relative"
        style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={16} />
        </button>

        {step === 'done' ? (
          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(96,133,255,0.15)', border: '1px solid rgba(96,133,255,0.3)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6085FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="font-bold text-white mb-1">비밀번호가 변경되었습니다</h3>
            <p className="text-sm text-slate-400 mb-5">다음 접속부터 새 비밀번호를 사용하세요.</p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: '#6085FF' }}
            >
              닫기
            </button>
          </div>
        ) : step === 'current' ? (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: '#6085FF' }}>Change Passcode</p>
            <h3 className="font-bold text-white mb-1">현재 비밀번호 확인</h3>
            <p className="text-sm text-slate-400 mb-6">먼저 현재 비밀번호를 입력해 주세요.</p>
            <div className="space-y-5">
              <PinInput value={current} onChange={v => { setCurrent(v); setError(''); }} autoFocus disabled={loading} theme="dark" />
              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              <button
                onClick={handleCurrentNext}
                disabled={current.length < 6 || loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
                style={{ background: current.length === 6 && !loading ? '#6085FF' : '#374151' }}
              >
                {loading ? '확인 중...' : '다음'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: '#6085FF' }}>New Passcode</p>
            <h3 className="font-bold text-white mb-1">새 비밀번호 설정</h3>
            <p className="text-sm text-slate-400 mb-6">새로 사용할 6자리 숫자를 입력해 주세요.</p>
            <div className="space-y-5">
              <div>
                <p className="text-xs text-slate-400 text-center mb-3">새 비밀번호</p>
                <PinInput value={newCode} onChange={v => { setNewCode(v); setError(''); }} autoFocus disabled={loading} theme="dark" />
              </div>
              <div>
                <p className="text-xs text-slate-400 text-center mb-3">새 비밀번호 확인</p>
                <PinInput value={confirmCode} onChange={v => { setConfirmCode(v); setError(''); }} disabled={loading} theme="dark" />
              </div>
              {error && <p className="text-sm text-red-400 text-center">{error}</p>}
              <button
                onClick={handleChange}
                disabled={newCode.length < 6 || confirmCode.length < 6 || loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40"
                style={{ background: newCode.length === 6 && confirmCode.length === 6 && !loading ? '#6085FF' : '#374151' }}
              >
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
