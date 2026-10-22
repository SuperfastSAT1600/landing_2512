'use client';

import { useState, type FormEvent } from 'react';

export function LoginForm({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-24 w-full max-w-sm space-y-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-base font-bold">직원용 일일 브리핑</h1>
      <p className="text-xs text-gray-500">SuperfastSAT 직원(staff) 계정으로 로그인하세요.</p>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일" autoComplete="username"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm" required />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm" required />
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {busy ? '확인 중…' : '로그인'}
      </button>
    </form>
  );
}
