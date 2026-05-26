'use client';

import { useState } from 'react';
import { PinInput } from './PinInput';

interface Props {
  token: string;
  onSuccess: () => void;
}

export default function PasscodeSetup({ token, onSuccess }: Props) {
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ready = passcode.length === 6 && confirm.length === 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (passcode !== confirm) { setError('비밀번호가 일치하지 않습니다'); setConfirm(''); return; }

    setLoading(true);
    const res = await fetch(`/api/portal/${token}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', passcode }),
    });
    setLoading(false);

    if (res.ok) { onSuccess(); return; }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? '오류가 발생했습니다');
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1 text-center" style={{ color: '#6085FF' }}>
        Set Passcode
      </p>
      <h2 className="text-xl font-bold text-white mb-1 text-center">비밀번호 설정</h2>
      <p className="text-sm text-slate-400 mb-7 text-center">
        이 공간에 접근하기 위한 6자리 숫자 비밀번호를 설정해 주세요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="text-xs text-slate-400 text-center mb-3">비밀번호 (6자리)</p>
          <PinInput value={passcode} onChange={v => { setPasscode(v); setError(''); }} autoFocus theme="dark" />
        </div>
        <div>
          <p className="text-xs text-slate-400 text-center mb-3">비밀번호 확인</p>
          <PinInput value={confirm} onChange={v => { setConfirm(v); setError(''); }} theme="dark" />
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          type="submit"
          disabled={!ready || loading}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
          style={{ background: ready && !loading ? '#6085FF' : '#374151', color: 'white' }}
        >
          {loading ? '설정 중...' : ready ? '비밀번호 설정하기' : `${passcode.length < 6 ? `비밀번호 ${passcode.length}/6` : `확인 ${confirm.length}/6`} 입력 중`}
        </button>
      </form>
    </div>
  );
}
