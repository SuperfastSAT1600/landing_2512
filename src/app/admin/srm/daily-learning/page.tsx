'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, FlaskConical, Library, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { DailyLearningResponse, StudentDayResult, StudyHallResult, TestCenterResult, VocabResult } from '@/app/api/admin/srm/daily-learning/route';


// ── Accuracy badge ────────────────────────────────────────────────────────────

function AccBadge({ pct }: { pct: number }) {
  const color =
    pct >= 85 ? 'bg-emerald-100 text-emerald-700 border-emerald-500/30' :
    pct >= 70 ? 'bg-blue-100 text-blue-700 border-blue-200' :
    pct >= 50 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                'bg-red-100 text-red-700 border-red-200';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${color}`}>
      {pct}%
    </span>
  );
}

// ── Study Hall card ───────────────────────────────────────────────────────────

function StudyHallCard({ data }: { data: StudyHallResult }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...data.skills].sort((a, b) => b.total - a.total);
  return (
    <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-3">
        <Library size={14} className="text-purple-700" />
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">스터디홀</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat label="학습 시간" value={`${data.durationMinutes}분`} />
        <Stat label="총 문항" value={`${data.totalProblems}문`} />
        <Stat label="정답" value={`${data.correctCount}/${data.totalProblems}`} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500">정답률</span>
          <AccBadge pct={data.accuracy} />
        </div>
      </div>
      {sorted.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-2"
          >
            스킬 {sorted.length}개 {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {expanded && (
            <div className="space-y-1.5">
              {sorted.map(sk => {
                const acc = sk.total > 0 ? Math.round((sk.correct / sk.total) * 100) : 0;
                return (
                  <div key={sk.skill} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-600 truncate flex-1">{sk.skill}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{sk.correct}/{sk.total}</span>
                    <AccBadge pct={acc} />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Test Center card ──────────────────────────────────────────────────────────

function TestCenterCard({ data }: { data: TestCenterResult }) {
  const domainLabel =
    data.curriculumDomain === 'reading_and_writing' ? 'RW' :
    data.curriculumDomain === 'math' ? 'Math' :
    data.curriculumDomain ?? '';
  return (
    <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical size={14} className="text-blue-700" />
        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">테스트센터</span>
        {domainLabel && (
          <span className="text-xs bg-blue-500/10 text-blue-700 border border-blue-500/20 px-1.5 py-0.5 rounded">
            {domainLabel}
          </span>
        )}
      </div>
      {data.curriculumTitle && (
        <p className="text-xs text-gray-600 mb-3 font-medium">{data.curriculumTitle}</p>
      )}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat label="총점" value={`${data.totalScore}/${data.totalProblems}`} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500">정답률</span>
          <AccBadge pct={data.totalProblems > 0 ? Math.round((data.totalScore / data.totalProblems) * 100) : 0} />
        </div>
      </div>
      {data.lessons.length > 0 && (
        <div className="space-y-1.5">
          {data.lessons.map((l, i) => {
            const acc = l.total > 0 ? Math.round((l.score / l.total) * 100) : 0;
            return (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 truncate flex-1">{l.title ?? `Module ${i + 1}`}</span>
                <span className="text-xs text-gray-500 whitespace-nowrap">{l.score}/{l.total}</span>
                <AccBadge pct={acc} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Vocab card ────────────────────────────────────────────────────────────────

function VocabCard({ data }: { data: VocabResult }) {
  return (
    <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={14} className="text-amber-700" />
        <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">단어</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat label="학습 단어" value={`${data.wordCount}개`} />
        <Stat label="채점 문항" value={`${data.gradedCount}문`} />
        <Stat label="정답" value={`${data.correctCount}/${data.gradedCount}`} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500">정답률</span>
          <AccBadge pct={data.accuracy} />
        </div>
      </div>
      {data.masteredCount > 0 && (
        <div className="mb-2">
          <span className="text-xs bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-0.5 rounded">
            마스터 {data.masteredCount}개
          </span>
        </div>
      )}
      {data.missedTerms.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-500 mb-1">복습 필요</p>
          <p className="text-xs text-gray-500 leading-relaxed">{data.missedTerms.join(', ')}</p>
        </div>
      )}
    </div>
  );
}

// ── Small stat ────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-100">{value}</span>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30 text-center">
      <span className="text-xs text-gray-600">{label} 기록 없음</span>
    </div>
  );
}

// ── Student column ────────────────────────────────────────────────────────────

function StudentColumn({ student }: { student: StudentDayResult }) {
  const hasAny = student.studyHall || student.testCenter.length > 0 || student.vocab;
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center pb-2 border-b border-gray-700/50">
        <p className="text-sm font-semibold text-gray-900">{student.name}</p>
        {!student.sfv2ProfileId && (
          <span className="text-[10px] text-red-700">v2 미연결</span>
        )}
        {!hasAny && student.sfv2ProfileId && (
          <span className="text-[10px] text-gray-500">이날 학습 기록 없음</span>
        )}
      </div>

      {student.vocab ? (
        <VocabCard data={student.vocab} />
      ) : (
        <EmptyState label="단어" />
      )}

      {student.testCenter.length > 0 ? (
        student.testCenter.map((tc, i) => <TestCenterCard key={i} data={tc} />)
      ) : (
        <EmptyState label="테스트센터" />
      )}

      {student.studyHall ? (
        <StudyHallCard data={student.studyHall} />
      ) : (
        <EmptyState label="스터디홀" />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DailyLearningPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [names, setNames] = useState<string[]>([]);
  const [namesInput, setNamesInput] = useState('');
  const [data, setData] = useState<DailyLearningResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const namesParam = encodeURIComponent(names.join(','));
      const res = await srmFetch(`/api/admin/srm/daily-learning?date=${targetDate}&names=${namesParam}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [names]);

  useEffect(() => { load(date); }, [date, names, load]);

  const dateLabel = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    : '';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">일별 학습 비교</h1>
            <p className="text-sm text-gray-500 mt-0.5">단어 · 테스트센터 · 스터디홀</p>
          </div>
          <button
            onClick={() => load(date)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-600 border border-gray-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>

        {/* Date selector */}
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-gray-500"
          />
          <span className="text-sm text-gray-500">{dateLabel}</span>
        </div>
        {/* Names input */}
        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            value={namesInput}
            onChange={e => setNamesInput(e.target.value)}
            placeholder="학생 이름 (쉼표로 구분, 예: 홍길동, Jane Doe)"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-500"
          />
          <button
            onClick={() => {
              const parsed = namesInput.split(',').map(n => n.trim()).filter(Boolean);
              setNames(parsed);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-gray-900 transition-colors"
          >
            조회
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700/40 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(names.length > 0 ? names : ['', '', '', '']).map((name, idx) => (
            <div key={name || idx} className="space-y-3">
              <div className="h-6 bg-gray-800 rounded animate-pulse" />
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-gray-800/60 rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Results grid */}
      {!loading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.students.map(student => (
            <StudentColumn key={student.name} student={student} />
          ))}
          {/* If a name is missing from results, show placeholder */}
          {names.filter(n => !data.students.find(s => s.name === n)).map(name => (
            <div key={name} className="flex flex-col gap-3">
              <div className="text-center pb-2 border-b border-gray-700/50">
                <p className="text-sm font-semibold text-gray-900">{name}</p>
                <span className="text-[10px] text-gray-600">학생 정보 없음</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
