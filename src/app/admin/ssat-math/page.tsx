'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';

const POLL_INTERVAL = 5000; // 5초마다 자동 갱신

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
  difficulty: string;
  domain: string;
}

interface StudentResult {
  id: string;
  student_id: string;
  set_number: number;
  score: number;
  total: number;
  elapsed_seconds: number | null;
  graded_detail: Record<string, GradedDetail>;
  submitted_at: string;
}

interface SelectedQuestion {
  question: Question;
  detail: GradedDetail;
  studentId: string;
}

const CHOICES = ['A', 'B', 'C', 'D', 'E'] as const;

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatTime(sec: number | null) {
  if (sec === null) return '-';
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatClock(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function QuestionModal({ selected, onClose }: { selected: SelectedQuestion; onClose: () => void }) {
  const { question: q, detail, studentId } = selected;
  const choiceMap: Record<string, string> = {
    A: q.choice_a, B: q.choice_b, C: q.choice_c, D: q.choice_d, E: q.choice_e,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1c1f] border border-white/10 rounded-2xl p-6 max-w-xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {q.domain} · {q.difficulty}
            </div>
            <div className="text-sm text-gray-400">
              Q{q.question_number} · {studentId.split('_')[0]}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold px-2 py-1 rounded-lg ${detail.is_correct ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {detail.is_correct ? '정답' : '오답'}
            </span>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
        </div>

        <div className="text-white text-base font-medium leading-relaxed mb-5">
          <ContentRenderer content={q.question_text} />
        </div>

        <div className="space-y-2">
          {CHOICES.map(letter => {
            const isCorrect = letter === detail.correct;
            const isStudentAnswer = letter === detail.answer;
            let bg = 'border-white/10 bg-[#09090b] text-gray-400';
            if (isCorrect) bg = 'border-green-500 bg-green-500/10 text-green-300';
            else if (isStudentAnswer && !isCorrect) bg = 'border-red-500 bg-red-500/10 text-red-300';

            return (
              <div key={letter} className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${bg}`}>
                <span className="font-bold shrink-0">{letter}</span>
                <ContentRenderer content={choiceMap[letter]} className="inline" />
                {isCorrect && <span className="ml-auto shrink-0 text-green-400 text-xs font-bold">정답</span>}
                {isStudentAnswer && !isCorrect && <span className="ml-auto shrink-0 text-red-400 text-xs font-bold">학생 답</span>}
              </div>
            );
          })}
        </div>

        {!detail.is_correct && (
          <div className="mt-4 flex gap-4 text-sm text-gray-500">
            <span>학생 답: <strong className="text-red-400">{detail.answer || '미응답'}</strong></span>
            <span>정답: <strong className="text-green-400">{detail.correct}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SSATMathAdminPage() {
  const { adminKey } = useAdminAuth();
  const [activeSet, setActiveSet] = useState(1);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<SelectedQuestion | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [live, setLive] = useState(true);

  const prevIdsRef = useRef<Set<string>>(new Set());
  const questionsLoadedForSet = useRef<number | null>(null);

  const fetchResults = useCallback(async (setNumber: number, isBackground = false) => {
    if (!adminKey) return;
    if (!isBackground) setInitialLoading(true);
    setError('');

    try {
      const fetches: Promise<Response>[] = [
        fetch(`/api/admin/ssat-math/results?set_number=${setNumber}`, {
          headers: { 'x-admin-key': adminKey },
        }),
      ];

      // 문제는 세트가 바뀔 때만 다시 로드
      const needQuestions = questionsLoadedForSet.current !== setNumber;
      if (needQuestions) {
        fetches.push(fetch(`/api/ssat-math/sets/${setNumber}/questions`));
      }

      const responses = await Promise.all(fetches);
      const [resResults] = responses;
      const jsonResults = await resResults.json();

      if (!resResults.ok) {
        setError(jsonResults.error?.message ?? '결과를 불러올 수 없습니다.');
        setResults([]);
      } else {
        const incoming = jsonResults.data as StudentResult[];

        // 새로 들어온 항목 감지
        const incomingIds = new Set(incoming.map(r => r.id));
        const appeared = new Set<string>();
        if (isBackground) {
          incomingIds.forEach(id => {
            if (!prevIdsRef.current.has(id)) appeared.add(id);
          });
          if (appeared.size > 0) {
            setNewIds(appeared);
            setTimeout(() => setNewIds(new Set()), 3000);
          }
        }
        prevIdsRef.current = incomingIds;
        setResults(incoming);
        setLastUpdated(new Date());
      }

      if (needQuestions && responses[1]) {
        const jsonQ = await responses[1].json();
        if (responses[1].ok) {
          setQuestions((jsonQ.data?.questions ?? []) as Question[]);
          questionsLoadedForSet.current = setNumber;
        }
      }
    } catch {
      if (!isBackground) setError('네트워크 오류가 발생했습니다.');
    } finally {
      if (!isBackground) setInitialLoading(false);
    }
  }, [adminKey]);

  // 세트 변경 시 초기 로드
  useEffect(() => {
    questionsLoadedForSet.current = null;
    setInitialLoading(true);
    setResults([]);
    prevIdsRef.current = new Set();
    fetchResults(activeSet, false);
  }, [activeSet, fetchResults]);

  // 자동 폴링
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      fetchResults(activeSet, true);
    }, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [activeSet, fetchResults, live]);

  const questionMap = Object.fromEntries(questions.map(q => [q.id, q]));
  const orderedQIds = questions.map(q => q.id);

  const avgScore = results.length > 0
    ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)
    : '-';

  return (
    <div className="p-6 min-h-screen bg-[#151719] text-gray-200">
      <div className="max-w-full">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">SSAT Math 결과</h1>
            <div className="flex items-center gap-3 mt-1">
              {/* Live indicator */}
              <button
                onClick={() => setLive(v => !v)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                  live
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-white/5 border-white/10 text-gray-500'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                {live ? 'LIVE' : '일시정지'}
              </button>
              {lastUpdated && (
                <span className="text-xs text-gray-600">
                  마지막 업데이트 {formatClock(lastUpdated)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => fetchResults(activeSet, false)}
            className="px-4 py-2 bg-[#1e2023] hover:bg-white/10 rounded-lg text-sm font-medium transition-all"
          >
            수동 새로고침
          </button>
        </div>

        {/* Set tabs */}
        <div className="flex flex-wrap gap-1 mb-6">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setActiveSet(n)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeSet === n
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1e2023] text-gray-400 hover:text-white'
              }`}
            >
              Set {n}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#1e2023] rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">제출 학생수</div>
            <div className="text-2xl font-bold text-white">{results.length}명</div>
          </div>
          <div className="bg-[#1e2023] rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">평균 점수</div>
            <div className="text-2xl font-bold text-white">{avgScore} / 15</div>
          </div>
          <div className="bg-[#1e2023] rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">세트</div>
            <div className="text-2xl font-bold text-white">Set {activeSet}</div>
          </div>
        </div>

        {initialLoading && (
          <div className="text-gray-500 text-center py-12">불러오는 중...</div>
        )}
        {error && (
          <div className="text-red-400 bg-red-400/10 rounded-xl p-4 mb-4">{error}</div>
        )}
        {!initialLoading && results.length === 0 && !error && (
          <div className="text-gray-500 text-center py-12">아직 제출된 결과가 없습니다.</div>
        )}

        {!initialLoading && results.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1e2023] text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 whitespace-nowrap">학생</th>
                  <th className="text-center px-3 py-3 whitespace-nowrap">점수</th>
                  <th className="text-center px-3 py-3 whitespace-nowrap">시간</th>
                  <th className="text-center px-3 py-3 whitespace-nowrap">제출</th>
                  {questions.map(q => (
                    <th key={q.id} className="text-center px-2 py-3 whitespace-nowrap">
                      Q{q.question_number}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {results.map(r => {
                  const displayName = r.student_id.split('_')[0] ?? r.student_id;
                  const isNew = newIds.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors duration-700 ${
                        isNew ? 'bg-blue-500/10' : 'hover:bg-white/3'
                      }`}
                    >
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          {isNew && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
                          )}
                          {displayName}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`font-bold ${r.score >= 12 ? 'text-green-400' : r.score >= 9 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {r.score}/{r.total}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-400 whitespace-nowrap font-mono">
                        {formatTime(r.elapsed_seconds)}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-500 whitespace-nowrap text-xs">
                        {formatDate(r.submitted_at)}
                      </td>
                      {orderedQIds.map(qid => {
                        const detail = r.graded_detail[qid];
                        const question = questionMap[qid];
                        if (!detail || !question) {
                          return <td key={qid} className="px-2 py-3 text-center"><span className="text-gray-600 text-xs">-</span></td>;
                        }
                        const badgeClass = detail.is_correct
                          ? 'bg-green-500/25 text-green-300 ring-1 ring-green-500/40 hover:bg-green-500/40'
                          : detail.answer
                          ? 'bg-red-500/25 text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/40'
                          : 'bg-white/5 text-gray-600 ring-1 ring-white/10 hover:bg-white/10';
                        return (
                          <td key={qid} className="px-1.5 py-3 text-center">
                            <button
                              onClick={() => setSelectedQuestion({ question, detail, studentId: r.student_id })}
                              className={`w-8 h-8 rounded-lg font-bold text-sm transition-all hover:scale-105 ${badgeClass}`}
                              title={detail.is_correct ? `정답 (${detail.answer})` : detail.answer ? `오답: ${detail.answer} → 정답 ${detail.correct}` : '미응답'}
                            >
                              {detail.answer || '-'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedQuestion && (
        <QuestionModal
          selected={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
        />
      )}
    </div>
  );
}
