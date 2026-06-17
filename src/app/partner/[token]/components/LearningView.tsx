'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, FlaskConical, Library, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { DailyLearningResponse, StudentDayResult, StudyHallResult, TestCenterResult, VocabResult } from '@/lib/learning-data';

const DEFAULT_DATE = '2026-06-16';

function AccBadge({ pct }: { pct: number }) {
  const color =
    pct >= 85 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    pct >= 70 ? 'bg-blue-50 text-blue-700 border-blue-200' :
    pct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-700 border-red-200';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded border ${color}`}>{pct}%</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm font-bold text-gray-800">{value}</span>
    </div>
  );
}

function SectionHeader({ icon, label, borderColor }: { icon: React.ReactNode; label: string; borderColor: string }) {
  return (
    <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${borderColor}`}>
      {icon}
      <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{label}</span>
    </div>
  );
}

function StudyHallCard({ data }: { data: StudyHallResult }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...data.skills].sort((a, b) => b.total - a.total);
  return (
    <div className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm">
      <SectionHeader icon={<Library size={14} className="text-purple-500" />} label="스터디홀" borderColor="border-purple-100" />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat label="학습 시간" value={`${data.durationMinutes}분`} />
        <Stat label="총 문항" value={`${data.totalProblems}문`} />
        <Stat label="정답" value={`${data.correctCount}/${data.totalProblems}`} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">정답률</span>
          <AccBadge pct={data.accuracy} />
        </div>
      </div>
      {sorted.length > 0 && (
        <>
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-2">
            스킬 {sorted.length}개 {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {expanded && (
            <div className="space-y-1.5 pt-1">
              {sorted.map(sk => {
                const acc = sk.total > 0 ? Math.round((sk.correct / sk.total) * 100) : 0;
                return (
                  <div key={sk.skill} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 flex-1 truncate">{sk.skill}</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{sk.correct}/{sk.total}</span>
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

function TestCenterCard({ data }: { data: TestCenterResult }) {
  const domainLabel =
    data.curriculumDomain === 'reading_and_writing' ? 'RW' :
    data.curriculumDomain === 'math' ? 'Math' :
    data.curriculumDomain ?? '';
  const acc = data.totalProblems > 0 ? Math.round((data.totalScore / data.totalProblems) * 100) : 0;
  return (
    <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
      <SectionHeader icon={<FlaskConical size={14} className="text-blue-500" />} label="테스트센터" borderColor="border-blue-100" />
      <div className="flex items-start gap-2 mb-3">
        {data.curriculumTitle && <p className="text-xs font-semibold text-gray-700 flex-1">{data.curriculumTitle}</p>}
        {domainLabel && (
          <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded whitespace-nowrap">{domainLabel}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat label="총점" value={`${data.totalScore}/${data.totalProblems}`} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">정답률</span>
          <AccBadge pct={acc} />
        </div>
      </div>
      {data.lessons.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-gray-50">
          {data.lessons.map((l, i) => {
            const la = l.total > 0 ? Math.round((l.score / l.total) * 100) : 0;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 flex-1 truncate">{l.title ?? `Module ${i + 1}`}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{l.score}/{l.total}</span>
                <AccBadge pct={la} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VocabCard({ data }: { data: VocabResult }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
      <SectionHeader icon={<BookOpen size={14} className="text-amber-500" />} label="단어" borderColor="border-amber-100" />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat label="학습 단어" value={`${data.wordCount}개`} />
        <Stat label="채점 문항" value={`${data.gradedCount}문`} />
        <Stat label="정답" value={`${data.correctCount}/${data.gradedCount}`} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">정답률</span>
          <AccBadge pct={data.accuracy} />
        </div>
      </div>
      {data.masteredCount > 0 && (
        <div className="mb-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">마스터 {data.masteredCount}개</span>
        </div>
      )}
      {data.missedTerms.length > 0 && (
        <div className="pt-2 border-t border-gray-50">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">복습 필요</p>
          <p className="text-xs text-gray-500 leading-relaxed">{data.missedTerms.join(', ')}</p>
        </div>
      )}
    </div>
  );
}

function EmptyCard({ label, borderColor, bgColor }: { label: string; borderColor: string; bgColor: string }) {
  return (
    <div className={`rounded-xl p-4 border ${borderColor} ${bgColor} text-center`}>
      <p className="text-xs text-gray-400">{label} 기록 없음</p>
    </div>
  );
}

const AVATAR_COLORS = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-rose-500'];

function StudentColumn({ student, index }: { student: StudentDayResult; index: number }) {
  const hasAny = student.studyHall || student.testCenter.length > 0 || student.vocab;
  return (
    <div className="flex flex-col gap-3">
      <div className="text-center py-3">
        <div className={`w-10 h-10 rounded-full ${AVATAR_COLORS[index % AVATAR_COLORS.length]} flex items-center justify-center mx-auto mb-2`}>
          <span className="text-white font-bold text-sm">{student.name.charAt(0)}</span>
        </div>
        <p className="text-sm font-bold text-gray-800">{student.name}</p>
        {!hasAny && <p className="text-[10px] text-gray-400 mt-0.5">이날 학습 기록 없음</p>}
      </div>

      {student.vocab
        ? <VocabCard data={student.vocab} />
        : <EmptyCard label="단어" borderColor="border-amber-50" bgColor="bg-amber-50/30" />}

      {student.testCenter.length > 0
        ? student.testCenter.map((tc, i) => <TestCenterCard key={i} data={tc} />)
        : <EmptyCard label="테스트센터" borderColor="border-blue-50" bgColor="bg-blue-50/30" />}

      {student.studyHall
        ? <StudyHallCard data={student.studyHall} />
        : <EmptyCard label="스터디홀" borderColor="border-purple-50" bgColor="bg-purple-50/30" />}
    </div>
  );
}

export function LearningView({ token }: { token: string }) {
  const [date, setDate] = useState(DEFAULT_DATE);
  const [data, setData] = useState<DailyLearningResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/${token}/learning?date=${targetDate}`);
      if (!res.ok) throw new Error(`데이터를 불러오지 못했습니다 (${res.status})`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(date); }, [date, load]);

  const dateLabel = date
    ? new Date(date + 'T12:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
    : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">SuperfastSAT</span>
              <span className="text-xs text-gray-400">파트너 리포트</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">일별 학습 현황</h1>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-indigo-400 shadow-sm"
            />
            <button
              onClick={() => load(date)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <p className="text-sm text-gray-500 mb-6">{dateLabel}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}

        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-1.5"><BookOpen size={12} className="text-amber-500" /><span className="text-xs text-gray-500">단어</span></div>
          <div className="flex items-center gap-1.5"><FlaskConical size={12} className="text-blue-500" /><span className="text-xs text-gray-500">테스트센터</span></div>
          <div className="flex items-center gap-1.5"><Library size={12} className="text-purple-500" /><span className="text-xs text-gray-500">스터디홀</span></div>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-200 inline-block" />≥85%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-200 inline-block" />70–84%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-200 inline-block" />50–69%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-200 inline-block" />&lt;50%</span>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="space-y-3">
                <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                {[1,2,3].map(j => <div key={j} className="h-28 bg-white rounded-xl animate-pulse border border-gray-100" />)}
              </div>
            ))}
          </div>
        )}

        {!loading && data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.students.map((s, i) => <StudentColumn key={s.name} student={s} index={i} />)}
          </div>
        )}
      </main>

      <footer className="mt-12 pb-6 text-center">
        <p className="text-xs text-gray-300">SuperfastSAT · 학습 현황 리포트</p>
      </footer>
    </div>
  );
}
