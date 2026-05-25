'use client';

import { useState } from 'react';

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
    setError('');
    if (passcode.length !== 6) { setError('6자리 숫자를 입력해 주세요'); return; }

    setLoading(true);
    const res = await fetch(`/api/portal/${token}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', passcode }),
    });
    setLoading(false);

    if (res.ok) {
      onSuccess();
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (res.status === 429 || data.locked) {
      onLocked();
      return;
    }
    setError(data.error ?? '오류가 발생했습니다');
    setPasscode('');
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 mb-1">비밀번호 입력</h2>
      <p className="text-sm text-gray-500 mb-6">
        상담 포털에 접근하려면 6자리 비밀번호를 입력해 주세요.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">비밀번호</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={passcode}
            autoFocus
            onChange={e => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-center text-xl tracking-[0.5em] focus:outline-none focus:border-blue-500"
            placeholder="••••••"
            required
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || passcode.length < 6}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors"
        >
          {loading ? '확인 중...' : '입력하기'}
        </button>
      </form>
    </div>
  );
}
