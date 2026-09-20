'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  choice_e: string;
  difficulty: string;
  domain: string;
}

interface GradedDetail {
  answer: string;
  correct: string;
  is_correct: boolean;
}

interface SubmitResult {
  score: number;
  total: number;
  graded_detail: Record<string, GradedDetail>;
}

interface Props {
  setNumber: number;
  questions: Question[];
  studentId: string;
  onComplete: (result: SubmitResult, elapsedSeconds: number) => void;
}

const TOTAL_SECONDS = 270;
const CHOICES = ['A', 'B', 'C', 'D', 'E'] as const;

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function TestScreen({ setNumber, questions, studentId, onComplete }: Props) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const startTime = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const submit = useCallback(async (currentAnswers: Record<string, string>) => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
    try {
      const res = await fetch('/api/ssat-math/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, set_number: setNumber, answers: currentAnswers, elapsed_seconds: elapsed }),
      });
      const json = await res.json();
      if (res.ok) {
        onComplete(json.data as SubmitResult, elapsed);
      }
    } catch {
      setSubmitting(false);
    }
  }, [submitting, studentId, setNumber, onComplete]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          submit(answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = questions[current];
  const choiceMap = {
    A: q.choice_a,
    B: q.choice_b,
    C: q.choice_c,
    D: q.choice_d,
    E: q.choice_e,
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLow = timeLeft <= 30;

  const answeredCount = Object.keys(answers).filter(k => questions.some(qq => qq.id === k)).length;
  const allAnswered = answeredCount === questions.length;

  const handleSelect = (letter: string) => {
    setAnswers(prev => ({ ...prev, [q.id]: letter }));
  };

  const handleSubmitClick = () => {
    if (!allAnswered) {
      setConfirmSubmit(true);
    } else {
      submit(answers);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#09090b] border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-gray-400 font-medium">
          Set {setNumber} &nbsp;·&nbsp; {current + 1} / {questions.length}
        </div>
        <div className={`text-xl font-mono font-bold tabular-nums ${isLow ? 'text-red-400' : 'text-white'}`}>
          {pad(minutes)}:{pad(seconds)}
        </div>
        <button
          onClick={handleSubmitClick}
          disabled={submitting}
          className="text-sm font-bold px-4 py-1.5 bg-[#071be9] hover:bg-[#1a31f0] rounded-lg transition-all disabled:opacity-40"
        >
          {submitting ? '채점 중...' : '제출하기'}
        </button>
      </div>

      {/* Question */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="mb-2 text-xs text-gray-500 uppercase tracking-wider">{q.domain} · {q.difficulty}</div>
        <div className="text-lg font-medium leading-relaxed mb-8">
          <ContentRenderer content={q.question_text} />
        </div>

        <div className="space-y-3">
          {CHOICES.map(letter => {
            const selected = answers[q.id] === letter;
            return (
              <button
                key={letter}
                onClick={() => handleSelect(letter)}
                className={`w-full text-left px-5 py-4 rounded-xl border text-base transition-all ${
                  selected
                    ? 'border-[#071be9] bg-[#071be9]/15 text-white'
                    : 'border-white/10 bg-[#09090b] text-gray-300 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <span className={`font-bold mr-3 ${selected ? 'text-[#6085FF]' : 'text-gray-500'}`}>{letter}</span>
                <ContentRenderer content={choiceMap[letter]} className="inline" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t border-white/5 bg-[#09090b] px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {/* Question number grid */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {questions.map((qq, idx) => {
              const ans = answers[qq.id];
              return (
                <button
                  key={qq.id}
                  onClick={() => setCurrent(idx)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                    current === idx
                      ? 'bg-[#071be9] text-white'
                      : ans
                      ? 'bg-blue-900/40 text-blue-300 border border-blue-700/30'
                      : 'bg-white/5 text-gray-500 border border-white/5'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Prev / Next */}
          <div className="flex gap-3">
            <button
              onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30 font-medium"
            >
              이전
            </button>
            <button
              onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
              disabled={current === questions.length - 1}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all disabled:opacity-30 font-medium"
            >
              다음
            </button>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#09090b] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center">
            <h3 className="text-lg font-bold mb-2">미응답 문제가 있어요</h3>
            <p className="text-gray-400 text-sm mb-6">
              {questions.length - answeredCount}개 문제에 답하지 않았습니다. 그래도 제출하시겠어요?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSubmit(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all"
              >
                취소
              </button>
              <button
                onClick={() => { setConfirmSubmit(false); submit(answers); }}
                className="flex-1 py-3 rounded-xl bg-[#071be9] hover:bg-[#1a31f0] font-bold transition-all"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
