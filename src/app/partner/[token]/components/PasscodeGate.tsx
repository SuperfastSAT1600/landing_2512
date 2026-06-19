'use client';

import { useState } from 'react';
import { PinInput } from './PinInput';

const btnPrimary: React.CSSProperties = {
  width: '100%',
  padding: '11px 24px',
  borderRadius: 9999,
  background: '#0075de',
  color: '#ffffff',
  fontSize: 16,
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.15s',
  lineHeight: 1.5,
};

const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  background: '#a8cfee',
  cursor: 'not-allowed',
};

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#615d59', textAlign: 'center', marginBottom: 12, letterSpacing: '0.025em' }}>
          비밀번호 (6자리)
        </p>
        <PinInput value={passcode} onChange={v => { setPasscode(v); setError(''); }} autoFocus />
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#615d59', textAlign: 'center', marginBottom: 12, letterSpacing: '0.025em' }}>
          비밀번호 확인
        </p>
        <PinInput value={confirm} onChange={v => { setConfirm(v); setError(''); }} />
      </div>
      {error && (
        <p style={{ fontSize: 13, color: '#dc2626', textAlign: 'center', margin: 0 }}>{error}</p>
      )}
      <button type="submit" disabled={!ready || loading} style={!ready || loading ? btnDisabled : btnPrimary}>
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PinInput value={passcode} onChange={v => { setPasscode(v); setError(''); }} autoFocus disabled={loading} />
      {error && (
        <p style={{ fontSize: 13, color: '#dc2626', textAlign: 'center', margin: 0 }}>{error}</p>
      )}
      <button type="submit" disabled={passcode.length < 6 || loading} style={passcode.length < 6 || loading ? btnDisabled : btnPrimary}>
        {loading ? '확인 중...' : '입력하기'}
      </button>
    </form>
  );
}
