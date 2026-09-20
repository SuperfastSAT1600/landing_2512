'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';

const COMPLETED_KEY = 'ssat_math_completed_v1';
const PREDICT_SECONDS = 10;

interface GradedDetail {
  answer: string;
  correct: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  choice_e: string;
}

interface Props {
  result: { score: number; total: number; graded_detail: Record<string, GradedDetail> };
  setNumber: number;
  elapsedSeconds: number;
  questions: Question[];
  onReturnToSelect: () => void;
}

type SubPhase = 'score' | 'predict' | 'reveal';

function markCompleted(setNumber: number) {
  if (typeof window === 'undefined') return;
  try {
    const existing = JSON.parse(sessionStorage.getItem(COMPLETED_KEY) ?? '[]') as number[];
    if (!existing.includes(setNumber)) {
      sessionStorage.setItem(COMPLETED_KEY, JSON.stringify([...existing, setNumber]));
    }
  } catch { /* ignore */ }
}

// ─── Score Phase ───────────────────────────────────────────────────────────
function ScorePhase({
  score, total, wrongCount, onStart,
}: { score: number; total: number; wrongCount: number; onStart: () => void }) {
  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center px-4">
      <p className="text-gray-400 text-base mb-2">채점 완료</p>
      <div className="text-7xl font-bold tabular-nums mb-1">
        {score}<span className="text-3xl text-gray-500">/{total}</span>
      </div>
      <p className="text-2xl font-semibold mt-4 mb-1">
        {wrongCount === 0
          ? '전부 맞혔어요!'
          : <><span className="text-red-400 font-bold">{wrongCount}개</span> 틀렸어요</>
        }
      </p>
      <p className="text-gray-500 text-sm mb-12">어떤 문제를 틀렸을 것 같아?</p>
      <button
        onClick={onStart}
        className="px-8 py-4 bg-[#071be9] hover:bg-[#1a31f0] rounded-xl font-bold text-lg transition-all shadow-lg shadow-[#071be9]/20"
      >
        예측 시작하기 →
      </button>
    </div>
  );
}

// ─── Predict Phase ──────────────────────────────────────────────────────────
function PredictPhase({
  questions,
  onDone,
}: { questions: Question[]; onDone: (predicted: Set<string>) => void }) {
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PREDICT_SECONDS);
  const [predicted, setPredicted] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const predictedRef = useRef<Set<string>>(new Set());

  const advance = useCallback(() => {
    setIdx(prev => {
      const next = prev + 1;
      if (next >= questions.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(() => onDone(predictedRef.current), 0);
        return prev;
      }
      setTimeLeft(PREDICT_SECONDS);
      return next;
    });
  }, [questions.length, onDone]);

  useEffect(() => {
    setTimeLeft(PREDICT_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          advance();
          return PREDICT_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [advance]);

  const togglePredict = () => {
    const q = questions[idx];
    setPredicted(prev => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      predictedRef.current = next;
      return next;
    });
  };

  const q = questions[idx];
  const isPredicted = predicted.has(q.id);
  const progress = (timeLeft / PREDICT_SECONDS) * 100;
  const choices: [string, string][] = [
    ['A', q.choice_a], ['B', q.choice_b], ['C', q.choice_c],
    ['D', q.choice_d], ['E', q.choice_e],
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#09090b] border-b border-white/5">
        {/* Time bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-[#071be9] transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-400 font-medium">
            예측 &nbsp;·&nbsp; {idx + 1} / {questions.length}
          </span>
          <span className="text-xl font-mono font-bold tabular-nums text-[#6085FF]">
            {timeLeft}s
          </span>
          <button
            onClick={advance}
            className="text-sm text-gray-500 hover:text-white transition-all px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            다음 →
          </button>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col">
        <div className="mb-1 text-xs text-gray-500 uppercase tracking-wider">Q{q.question_number}</div>
        <div className="text-base font-medium leading-relaxed mb-6 text-gray-200">
          <ContentRenderer content={q.question_text} />
        </div>
        <div className="space-y-2 mb-8">
          {choices.map(([letter, text]) => (
            <div
              key={letter}
              className="w-full text-left px-4 py-3 rounded-xl border border-white/5 bg-[#09090b] text-gray-400 text-sm"
            >
              <span className="font-bold text-gray-600 mr-2">{letter}</span>
              <ContentRenderer content={text} className="inline" />
            </div>
          ))}
        </div>

        {/* Prediction grid */}
        <div className="flex flex-wrap gap-1.5 mb-6 justify-center">
          {questions.map((qq, i) => (
            <div
              key={qq.id}
              className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center border transition-all ${
                i === idx
                  ? 'bg-[#071be9] border-[#071be9] text-white'
                  : predicted.has(qq.id)
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-white/5 border-white/5 text-gray-600'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Predict button */}
        <button
          onClick={togglePredict}
          className={`w-full py-5 rounded-2xl font-bold text-lg transition-all ${
            isPredicted
              ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
              : 'bg-[#09090b] border-2 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
          }`}
        >
          {isPredicted ? '✓ 이 문제 틀린 것 같아요' : '이 문제 틀린 것 같아요'}
        </button>
      </div>
    </div>
  );
}

// ─── Reveal Phase ────────────────────────────────────────────────────────────
function RevealPhase({
  questions,
  graded_detail,
  predicted,
  score,
  total,
  onReturnToSelect,
}: {
  questions: Question[];
  graded_detail: Record<string, GradedDetail>;
  predicted: Set<string>;
  score: number;
  total: number;
  onReturnToSelect: () => void;
}) {
  const wrongCount = total - score;

  // Categorise
  let correctPredictions = 0; // 예측 맞음 (둘 다 틀림)
  let missedMistakes = 0;     // 실제 틀렸지만 예측 못함
  let falseAlarms = 0;        // 예측했지만 실제 맞음

  questions.forEach(q => {
    const isWrong = !graded_detail[q.id]?.is_correct;
    const wasPredicted = predicted.has(q.id);
    if (isWrong && wasPredicted) correctPredictions++;
    else if (isWrong && !wasPredicted) missedMistakes++;
    else if (!isWrong && wasPredicted) falseAlarms++;
  });

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans px-4 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-1">결과 공개</h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          {total - score === 0 ? '모두 정답!' : `${wrongCount}개 틀림`}
        </p>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{correctPredictions}</div>
            <div className="text-xs text-gray-400 mt-1">예측 성공</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{missedMistakes}</div>
            <div className="text-xs text-gray-400 mt-1">놓친 실수</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{falseAlarms}</div>
            <div className="text-xs text-gray-400 mt-1">불필요한 걱정</div>
          </div>
        </div>

        {/* Question grid */}
        <div className="bg-[#09090b] border border-white/5 rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/30 border border-green-500/40 inline-block" /> 정답</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/40 inline-block" /> 오답</span>
            <span className="flex items-center gap-1 ml-auto">🔴 예측함</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {questions.map(q => {
              const isWrong = !graded_detail[q.id]?.is_correct;
              const wasPredicted = predicted.has(q.id);
              const detail = graded_detail[q.id];

              let bg = 'bg-green-500/10 border-green-500/20 text-green-400';
              if (isWrong) bg = 'bg-red-500/10 border-red-500/20 text-red-400';

              return (
                <div
                  key={q.id}
                  className={`relative flex flex-col items-center justify-center rounded-xl py-3 border text-sm font-bold ${bg}`}
                >
                  {wasPredicted && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold leading-none">●</span>
                  )}
                  <span className="text-xs text-gray-500 mb-0.5">Q{q.question_number}</span>
                  <span>{isWrong ? 'X' : 'O'}</span>
                  {isWrong && detail && (
                    <span className="text-[10px] text-gray-500 mt-0.5">→{detail.correct}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onReturnToSelect}
          className="w-full py-4 bg-[#071be9] hover:bg-[#1a31f0] rounded-xl font-bold text-lg transition-all"
        >
          다른 세트 풀기
        </button>
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function ResultScreen({ result, setNumber, elapsedSeconds, questions, onReturnToSelect }: Props) {
  markCompleted(setNumber);

  const [subPhase, setSubPhase] = useState<SubPhase>('score');
  const [predicted, setPredicted] = useState<Set<string>>(new Set());

  const { score, total, graded_detail } = result;
  const wrongCount = total - score;

  if (subPhase === 'score') {
    return (
      <ScorePhase
        score={score}
        total={total}
        wrongCount={wrongCount}
        onStart={() => setSubPhase('predict')}
      />
    );
  }

  if (subPhase === 'predict') {
    return (
      <PredictPhase
        questions={questions}
        onDone={(pred) => {
          setPredicted(pred);
          setSubPhase('reveal');
        }}
      />
    );
  }

  return (
    <RevealPhase
      questions={questions}
      graded_detail={graded_detail}
      predicted={predicted}
      score={score}
      total={total}
      onReturnToSelect={onReturnToSelect}
    />
  );
}
