'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { TestResult } from '@/types/diagnosis';
import { QuestionStat } from '@/lib/diagnosis-analysis';
import QuestionStatCard from './QuestionStatCard';
import diagnosticTest1 from '@/app/diagnosis/data/diagnostic-test-1';
import { diagnosticTest2Vocab } from '@/app/diagnosis/data/diagnostic-test-2-vocab';
import type { VocabAnswer, RWSequentialAnswer } from '@/types/diagnosis';

export default function AdminDiagnosisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, adminKey, loading: authLoading } = useAdminAuth();

  const [result, setResult] = useState<TestResult | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, QuestionStat> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [nameEditError, setNameEditError] = useState('');

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

  const handleUpdateName = async () => {
    const trimmed = editingNameValue.trim();
    if (!trimmed) {
      setNameEditError('학생명은 비워둘 수 없습니다.');
      return;
    }
    setNameEditError('');
    try {
      const res = await fetch(`/api/admin/diagnosis/results/${resultId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ studentName: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '수정 실패');
      }
      setEditingName(false);
      await fetchResult();
    } catch (err) {
      setNameEditError(err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.');
    }
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

  const rawAnswers = (result.answers || {}) as Record<string, unknown>;
  const isV2 = rawAnswers.__v2__ === true;

  interface VocabItem {
    wordId: string;
    word: string;
    selectedOptionId: string | null;
    correctOptionId: string;
    selectedText: string;
    correctText: string;
    isCorrect: boolean;
    timeTaken: number;
  }

  let answers: Record<string, string>;
  let vocabItems: VocabItem[] = [];

  if (isV2) {
    const vocabArr = (rawAnswers.vocab as VocabAnswer[]) ?? [];
    const rw = (rawAnswers.rw as RWSequentialAnswer[]) ?? [];
    const math = (rawAnswers.math as Record<string, string>) ?? {};
    answers = {
      ...math,
      ...Object.fromEntries(rw.map(r => [r.questionId, r.finalAnswer])),
    };
    const vocabWordMap = new Map(diagnosticTest2Vocab.map(v => [v.id, v]));
    vocabItems = vocabArr.map(v => {
      const def = vocabWordMap.get(v.wordId);
      const correctOpt = def?.options.find(o => o.type === 'correct');
      const selectedOpt = def?.options.find(o => o.id === v.selectedOptionId);
      return {
        wordId: v.wordId,
        word: def?.word ?? v.wordId,
        selectedOptionId: v.selectedOptionId,
        correctOptionId: correctOpt?.id ?? '',
        selectedText: selectedOpt ? `${selectedOpt.id}. ${selectedOpt.text}` : '미답변',
        correctText: correctOpt ? `${correctOpt.id}. ${correctOpt.text}` : '',
        isCorrect: v.isCorrect,
        timeTaken: v.timeTaken,
      };
    });
  } else {
    answers = rawAnswers as Record<string, string>;
  }

  const confidenceLevels = (result.confidenceLevels || {}) as Record<string, number>;
  const questionTimes = (result.questionTimes || {}) as Record<string, number>;
  const flaggedQuestions = (result.flaggedQuestions || []) as string[];

  const correctAnswersMap: Record<string, string> = {};
  for (const q of diagnosticTest1.questions) {
    correctAnswersMap[q.id] = q.type === 'multiple-choice'
      ? (q.options?.find(o => o.type === 'correct')?.id ?? '')
      : (q.answers?.[0] ?? '');
  }
  if (isV2) {
    for (const v of diagnosticTest2Vocab) {
      const correctOption = v.options.find(o => o.type === 'correct');
      if (correctOption) correctAnswersMap[v.id] = correctOption.id;
    }
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
              {editingName ? (
                <span className="inline-flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      value={editingNameValue}
                      onChange={(e) => setEditingNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateName();
                        if (e.key === 'Escape') { setEditingName(false); setNameEditError(''); }
                      }}
                      autoFocus
                      className="px-2 py-1 bg-gray-600 border border-blue-500 rounded text-white text-sm focus:outline-none w-48"
                    />
                    <button
                      onClick={handleUpdateName}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold transition-colors"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => { setEditingName(false); setNameEditError(''); }}
                      className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
                    >
                      취소
                    </button>
                  </span>
                  {nameEditError && (
                    <span className="text-red-400 text-xs">{nameEditError}</span>
                  )}
                </span>
              ) : (
                <button
                  onClick={() => {
                    setEditingNameValue(result.studentName);
                    setEditingName(true);
                    setNameEditError('');
                  }}
                  className="font-semibold hover:text-blue-400 transition-colors"
                  title="클릭하여 학생명 수정"
                >
                  {result.studentName}
                </button>
              )}
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
              {isV2 && vocabItems.length > 0 && (
                <span className="text-purple-300 text-sm ml-2">+{vocabItems.length}단어</span>
              )}
            </div>
          </div>
        </div>

        {/* Vocab Section (v2 only) — comes first, matching actual test order */}
        {isV2 && vocabItems.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">단어 답변 <span className="text-purple-300 text-base font-normal">({vocabItems.filter(v => v.isCorrect).length}/{vocabItems.length} 정답)</span></h2>
            {vocabItems.map((item) => (
              <div key={item.wordId} className="bg-gray-800 rounded-lg p-5 flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{item.word}</span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={item.isCorrect
                        ? { background: '#03B26C20', color: '#03B26C' }
                        : { background: '#F0445220', color: '#F04452' }
                      }
                    >
                      {item.isCorrect ? '정답' : '오답'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">선택: </span>
                    <span className={item.isCorrect ? 'text-green-400' : 'text-red-400'}>{item.selectedText}</span>
                  </div>
                  {!item.isCorrect && (
                    <div className="text-sm">
                      <span className="text-gray-400">정답: </span>
                      <span className="text-green-400">{item.correctText}</span>
                    </div>
                  )}
                </div>
                <div className="text-right text-sm shrink-0">
                  <div className="text-gray-400 mb-0.5">소요 시간</div>
                  <div className="font-semibold">
                    {item.timeTaken < 60
                      ? `${item.timeTaken}초`
                      : `${Math.floor(item.timeTaken / 60)}분 ${item.timeTaken % 60}초`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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
