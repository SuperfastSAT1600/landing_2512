'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { TestResult } from '@/types/diagnosis';
import { QuestionStat } from '@/lib/diagnosis-analysis';
import QuestionStatCard from './QuestionStatCard';
import diagnosticTest1 from '@/app/diagnosis/data/diagnostic-test-1';

export default function AdminDiagnosisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, adminKey, loading: authLoading } = useAdminAuth();

  const [result, setResult] = useState<TestResult | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, QuestionStat> | null>(null);
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
      if (data.result?.testVersionId) {
        fetchStats(data.result.testVersionId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (versionId: string) => {
    try {
      const res = await fetch(`/api/admin/diagnosis/question-stats?versionId=${versionId}`, {
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, QuestionStat> = {};
      for (const s of data.stats as QuestionStat[]) map[s.questionId] = s;
      setStatsMap(map);
    } catch { /* stats are supplementary — fail silently */ }
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

  const correctAnswersMap: Record<string, string> = {};
  for (const q of diagnosticTest1.questions) {
    correctAnswersMap[q.id] = q.type === 'multiple-choice'
      ? (q.options?.find(o => o.type === 'correct')?.id ?? '')
      : (q.answers?.[0] ?? '');
  }

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
            {result.previousScoreStatus === 'scored' && result.previousRwScore && result.previousMathScore && (
              <div>
                <span className="text-gray-400">이전 SAT: </span>
                <span className="font-semibold">
                  RW {result.previousRwScore} / Math {result.previousMathScore}
                  {result.previousTestDate && (
                    <span className="text-gray-400 font-normal ml-1">
                      ({result.previousTestDate.slice(0, 7)})
                    </span>
                  )}
                  <span className="text-gray-400 font-normal ml-2">
                    = {result.previousRwScore + result.previousMathScore}점
                  </span>
                </span>
              </div>
            )}
            {result.previousScoreStatus === 'never_taken' && (
              <div>
                <span className="text-gray-400">이전 SAT: </span>
                <span className="font-semibold">시험 경험 없음</span>
              </div>
            )}
            {result.previousScoreStatus === 'dont_remember' && (
              <div>
                <span className="text-gray-400">이전 SAT: </span>
                <span className="font-semibold">점수 미기억</span>
              </div>
            )}
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
              <span className="text-gray-400 block mb-1">응답 / 총 문제</span>
              <span className="font-semibold">{Object.keys(answers).length} / {Object.keys(questionTimes).length}</span>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">문제별 답변</h2>
          {Object.keys(answers)
            .sort((a, b) => {
              const aNum = statsMap?.[a]?.questionNumber ?? 9999;
              const bNum = statsMap?.[b]?.questionNumber ?? 9999;
              return aNum - bNum;
            })
            .map((questionId) => (
            <QuestionStatCard
              key={questionId}
              questionId={questionId}
              studentAnswer={answers[questionId]}
              confidenceValue={confidenceLevels[questionId]}
              timeSeconds={questionTimes[questionId] || 0}
              isFlagged={flaggedQuestions.includes(questionId)}
              stat={statsMap?.[questionId] ?? null}
              correctAnswer={correctAnswersMap[questionId]}
              timeLimitMinutes={result.timeLimitMinutes}
            />
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
