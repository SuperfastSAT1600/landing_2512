'use client';

import { useState } from 'react';
import { ValidateTokenResponse } from '@/types/diagnosis';

interface TokenInputFormProps {
  onSuccess: (data: ValidateTokenResponse) => void;
}

export function TokenInputForm({ onSuccess }: TokenInputFormProps) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!token.trim()) {
      setError('접속 코드를 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/diagnosis/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '유효하지 않은 접속 코드입니다.');
      }

      const data: ValidateTokenResponse = await response.json();
      onSuccess(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#1e2023] rounded-2xl border border-white/5 p-6 md:p-8 shadow-2xl">
      <h2 className="text-2xl font-bold text-center mb-2">접속 코드를 입력하세요</h2>
      <p className="text-gray-500 text-sm text-center mb-8">
        문자/이메일로 받은 UUID 코드를 입력해주세요
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="text"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setError('');
            }}
            placeholder="예: 550e8400-e29b-41d4-a716-446655440000"
            className="w-full px-4 py-3 bg-[#151719] border border-white/10 rounded-xl text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            disabled={loading}
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-lg shadow-lg shadow-blue-900/20"
        >
          {loading ? '확인 중...' : '확인'}
        </button>
      </form>
    </div>
  );
}
