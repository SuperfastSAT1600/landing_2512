'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { ContentRenderer } from '@/app/diagnosis/components/ContentRenderer';

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
        {/* Header */}
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
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Question text */}
        <div className="text-white text-base font-medium leading-relaxed mb-5">
          <ContentRenderer content={q.question_text} />
        </div>

        {/* Choices */}
        <div className="space-y-2">
          {CHOICES.map(letter => {
            const isCorrect = letter === detail.correct;
            const isStudentAnswer = letter === detail.answer;
            let bg = 'border-white/10 bg-[#09090b] text-gray-400';
            if (isCorrect) bg = 'border-green-500 bg-green-500/10 text-green-300';
            else if (isStudentAnswer && !isCorrect) bg = 'border-red-500 bg-red-500/10 text-red-300';

            return (
              <div
                key={letter}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${bg}`}
              >
                <span className="font-bold shrink-0">{letter}</span>
                <ContentRenderer content={choiceMap[letter]} className="inline" />
                {isCorrect && <span className="ml-auto shrink-0 text-green-400 text-xs font-bold">정답</span>}
                {isStudentAnswer && !isCorrect && <span className="ml-auto shrink-0 text-red-400 text-xs font-bold">학생 답</span>}
              </div>
            );
          })}
        </div>

        {/* Footer summary */}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<SelectedQuestion | null>(null);

  const fetchResults = useCallback(async (setNumber: number) => {
    if (!adminKey) return;
    setLoading(true);
    setError('');
    try {
      const [resResults, resQuestions] = await Promise.all([
        fetch(`/api/admin/ssat-math/results?set_number=${setNumber}`, {
          headers: { 'x-admin-key': adminKey },
        }),
        fetch(`/api/ssat-math/sets/${setNumber}/questions`),
      ]);

      const jsonResults = await resResults.json();
      const jsonQuestions = await resQuestions.json();

      if (!resResults.ok) {
        setError(jsonResults.error?.message ?? '결과를 불러올 수 없습니다.');
        setResults([]);
      } else {
        setResults(jsonResults.data as StudentResult[]);
      }

      if (resQuestions.ok) {
        setQuestions((jsonQuestions.data?.questions ?? []) as Question[]);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    fetchResults(activeSet);
  }, [activeSet, fetchResults]);

  // Build UUID → Question map
  const questionMap = Object.fromEntries(questions.map(q => [q.id, q]));

  // Ordered question IDs by question_number
  const orderedQIds = questions.map(q => q.id);

  const avgScore = results.length > 0
    ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)
    : '-';

  return (
    <div className="p-6 min-h-screen bg-[#151719] text-gray-200">
      <div className="max-w-full">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">SSAT Math 결과</h1>
            <p className="text-gray-500 text-sm mt-1">학생들의 세트별 정오답 결과 · 문제 클릭 시 내용 확인</p>
          </div>
          <button
            onClick={() => fetchResults(activeSet)}
            className="px-4 py-2 bg-[#1e2023] hover:bg-white/10 rounded-lg text-sm font-medium transition-all"
          >
            새로고침
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

        {loading && (
          <div className="text-gray-500 text-center py-12">불러오는 중...</div>
        )}
        {error && (
          <div className="text-red-400 bg-red-400/10 rounded-xl p-4 mb-4">{error}</div>
        )}

        {!loading && results.length === 0 && !error && (
          <div className="text-gray-500 text-center py-12">아직 제출된 결과가 없습니다.</div>
        )}

        {!loading && results.length > 0 && (
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
                  return (
                    <tr key={r.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{displayName}</td>
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
                          return <td key={qid} className="px-2 py-3 text-center"><span className="text-gray-600">-</span></td>;
                        }
                        return (
                          <td key={qid} className="px-2 py-3 text-center">
                            <button
                              onClick={() => setSelectedQuestion({ question, detail, studentId: r.student_id })}
                              className={`w-7 h-7 rounded-md font-bold text-xs transition-all hover:scale-110 hover:ring-2 ${
                                detail.is_correct
                                  ? 'text-green-400 hover:ring-green-500/50 hover:bg-green-500/10'
                                  : detail.answer
                                  ? 'text-red-400 hover:ring-red-500/50 hover:bg-red-500/10'
                                  : 'text-gray-600 hover:ring-white/20 hover:bg-white/5'
                              }`}
                            >
                              {detail.is_correct ? 'O' : detail.answer ? 'X' : '-'}
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
