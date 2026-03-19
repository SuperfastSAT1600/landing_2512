'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { TestResult } from '@/types/diagnosis';

export default function AdminDiagnosisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, adminKey, loading: authLoading } = useAdminAuth();

  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const resultId = params.id as string;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/admin');
      return;
    }

    fetchResult();
  }, [isAuthenticated, resultId, authLoading]);

  const fetchResult = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/diagnosis/results/${resultId}`, {
        headers: {
          'x-admin-key': adminKey,
        },
      });

      if (!response.ok) {
        throw new Error('결과를 불러올 수 없습니다.');
      }

      const data = await response.json();
      setResult(data.result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const CONFIDENCE_MAP: Record<number, { label: string; color: string }> = {
    0:   { label: 'No Idea',     color: '#8B95A1' },
    25:  { label: 'Guessing',    color: '#F04452' },
    50:  { label: 'Not Sure',    color: '#F59E0B' },
    75:  { label: 'Fairly Sure', color: '#3182F6' },
    100: { label: 'Very Sure',   color: '#03B26C' },
  };

  const formatConfidence = (value: number | undefined) => {
    if (value === undefined || value === null) return null;
    return CONFIDENCE_MAP[value] ?? { label: `${value}%`, color: '#8B95A1' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>결과를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const answers = (result.answers || {}) as Record<string, string>;
  const confidenceLevels = (result.confidenceLevels || {}) as Record<string, number>;
  const questionTimes = (result.questionTimes || {}) as Record<string, number>;
  const flaggedQuestions = (result.flaggedQuestions || []) as string[];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">시험 결과 상세</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            뒤로 가기
          </button>
        </div>

        {/* Student Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">학생 정보</h2>
          <div className="space-y-2">
            <div>
              <span className="text-gray-400">이름: </span>
              <span className="font-semibold">{result.studentName}</span>
            </div>
            <div>
              <span className="text-gray-400">이메일: </span>
              <span className="font-semibold break-all">{result.studentEmail}</span>
            </div>
          </div>
        </div>

        {/* Test Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">시험 정보</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <span className="text-gray-400 block mb-1">응시 시작</span>
              <span className="font-semibold">{formatDate(result.startedAt)}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">응시 완료</span>
              <span className="font-semibold">{formatDate(result.submittedAt)}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">총 소요 시간</span>
              <span className="font-semibold">{formatTime(result.totalTimeSeconds)}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-1">문제 개수</span>
              <span className="font-semibold">{Object.keys(answers).length}</span>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">문제별 답변</h2>
          {Object.keys(answers).map((questionId) => (
            <div key={questionId} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">문제 {questionId}</h3>
                  {flaggedQuestions.includes(questionId) && (
                    <span className="text-yellow-400 text-sm">⭐ 표시됨</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">소요 시간</div>
                  <div className="font-semibold">
                    {formatTime(questionTimes[questionId] || 0)}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-gray-400 block mb-1">선택 답변</span>
                  <span className="font-semibold">{answers[questionId] || '미답변'}</span>
                </div>

                <div>
                  <span className="text-gray-400 block mb-1">Confidence</span>
                  {(() => {
                    const conf = formatConfidence(confidenceLevels[questionId]);
                    if (!conf) return <span className="text-gray-500 text-sm">N/A</span>;
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 text-sm font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${conf.color}20`, color: conf.color }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: conf.color }} />
                        {conf.label} · {confidenceLevels[questionId]}%
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-gray-800 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold mb-4">요약</h2>
          <div className="space-y-2">
            <div>
              <span className="text-gray-400">답변한 문제: </span>
              <span className="font-semibold">{Object.keys(answers).length}개</span>
            </div>
            <div>
              <span className="text-gray-400">표시된 문제: </span>
              <span className="font-semibold">{flaggedQuestions.length}개</span>
            </div>
            <div>
              <span className="text-gray-400">평균 Confidence: </span>
              <span className="font-semibold">
                {Object.values(confidenceLevels).length > 0
                  ? `${(Object.values(confidenceLevels).reduce((a, b) => a + b, 0) / Object.values(confidenceLevels).length).toFixed(0)}%`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
