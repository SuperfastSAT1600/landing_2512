'use client';

import { useState } from 'react';
import { PinInput } from './PinInput';

interface Props {
  token: string;
  onSuccess: () => void;
  onLocked: () => void;
}

export default function PasscodeEntry({ token, onSuccess, onLocked }: Props) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passcode.length !== 6) return;
    setError('');
    setLoading(true);

    const res = await fetch(`/api/portal/${token}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', passcode }),
    });
    setLoading(false);

    if (res.ok) { onSuccess(); return; }
    const data = await res.json().catch(() => ({}));
    if (res.status === 429 || data.locked) { onLocked(); return; }
    setError(data.error ?? '오류가 발생했습니다');
    setPasscode('');
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1 text-center" style={{ color: '#6085FF' }}>
        Enter Passcode
      </p>
      <h2 className="text-xl font-bold text-white mb-1 text-center">비밀번호 입력</h2>
      <p className="text-sm text-slate-400 mb-7 text-center">6자리 비밀번호를 입력해 주세요.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <PinInput value={passcode} onChange={v => { setPasscode(v); setError(''); }} autoFocus disabled={loading} theme="dark" />

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          type="submit"
          disabled={passcode.length < 6 || loading}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
          style={{ background: passcode.length === 6 && !loading ? '#6085FF' : '#374151', color: 'white' }}
        >
          {loading ? '확인 중...' : '입력하기'}
        </button>
      </form>
    </div>
  );
}
