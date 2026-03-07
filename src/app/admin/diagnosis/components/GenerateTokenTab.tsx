'use client';

import { useState } from 'react';
import { GenerateTokenResponse } from '@/types/diagnosis';

interface GenerateTokenTabProps {
  adminKey: string;
}

export function GenerateTokenTab({ adminKey }: GenerateTokenTabProps) {
  const [studentEmail, setStudentEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedToken, setGeneratedToken] = useState<GenerateTokenResponse | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!studentEmail.trim() || !studentName.trim()) {
      setError('학생명과 이메일을 모두 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/diagnosis/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          studentEmail: studentEmail.trim(),
          studentName: studentName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '토큰 생성 실패');
      }

      const data: GenerateTokenResponse = await response.json();
      setGeneratedToken(data);
      setStudentEmail('');
      setStudentName('');
    } catch (err) {
      const message = err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleGenerate} className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-semibold mb-2">학생명</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="예: 홍길동"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">이메일</label>
          <input
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            placeholder="예: student@example.com"
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !studentName.trim() || !studentEmail.trim()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '생성 중...' : '토큰 생성'}
        </button>
      </form>

      {generatedToken && (
        <div className="bg-gray-700 border border-green-600 rounded-lg p-6 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-green-400">토큰이 생성되었습니다!</h3>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-300 mb-1">학생명</p>
              <p className="font-semibold">{generatedToken.studentName}</p>
            </div>

            <div>
              <p className="text-sm text-gray-300 mb-1">이메일</p>
              <p className="font-semibold">{generatedToken.studentEmail}</p>
            </div>

            <div>
              <p className="text-sm text-gray-300 mb-1">토큰</p>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-600 rounded text-sm break-all">
                  {generatedToken.token}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedToken.token)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-semibold transition-colors"
                >
                  복사
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-300 mb-1">테스트 링크</p>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-600 rounded text-sm break-all">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/diagnosis?token=${generatedToken.token}`}
                </code>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `${typeof window !== 'undefined' ? window.location.origin : ''}/diagnosis?token=${generatedToken.token}`
                    )
                  }
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-semibold transition-colors"
                >
                  복사
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-300 mb-1">만료 시간</p>
              <p className="font-semibold">
                {new Date(generatedToken.expiresAt).toLocaleString('ko-KR')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
