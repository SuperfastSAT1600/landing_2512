'use client';

import { useState } from 'react';
import { PinInput } from './PinInput';

// ── Setup (first time) ────────────────────────────────────────────────────────

export function PasscodeSetup({ token, onSuccess }: { token: string; onSuccess: () => void }) {
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
    const res = await fetch(`/api/partner/${token}/auth`, {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-xs text-gray-500 text-center mb-3 font-medium">비밀번호 (6자리)</p>
        <PinInput value={passcode} onChange={v => { setPasscode(v); setError(''); }} autoFocus />
      </div>
      <div>
        <p className="text-xs text-gray-500 text-center mb-3 font-medium">비밀번호 확인</p>
        <PinInput value={confirm} onChange={v => { setConfirm(v); setError(''); }} />
      </div>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      <button
        type="submit"
        disabled={!ready || loading}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? '설정 중...' : '비밀번호 설정하기'}
      </button>
    </form>
  );
}

// ── Entry (subsequent visits) ─────────────────────────────────────────────────

export function PasscodeEntry({ token, onSuccess, onLocked }: { token: string; onSuccess: () => void; onLocked: () => void }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passcode.length !== 6) return;
    setError('');
    setLoading(true);
    const res = await fetch(`/api/partner/${token}/auth`, {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <PinInput value={passcode} onChange={v => { setPasscode(v); setError(''); }} autoFocus disabled={loading} />
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      <button
        type="submit"
        disabled={passcode.length < 6 || loading}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? '확인 중...' : '입력하기'}
      </button>
    </form>
  );
}
