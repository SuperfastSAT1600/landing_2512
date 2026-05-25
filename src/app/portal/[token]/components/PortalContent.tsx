'use client';

import { useState, useEffect, useRef } from 'react';
import PasscodeChange from './PasscodeChange';

interface PublishedMemo {
  id: string;
  created_at: string;
  content: string;
}

interface DiagnosticResult {
  id: string;
  submitted_at: string;
  test_id: string;
  total_time_seconds: number;
  question_count: number;
}

interface StudentInfo {
  name: string;
  grade: string;
  school_type: string;
  desired_subjects: string;
  target_score: number | null;
  target_test_date: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
}

interface PortalData {
  student: StudentInfo;
  publishedMemos: PublishedMemo[];
  diagnosticResult: DiagnosticResult | null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s}초`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200/60 p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-3">{children}</p>;
}

export default function PortalContent({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const [showChangePasscode, setShowChangePasscode] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/${token}/data`)
      .then(r => { if (!r.ok) throw new Error('unauthorized'); return r.json(); })
      .then(setData)
      .catch(() => setError('데이터를 불러오는 중 오류가 발생했습니다.'));
  }, [token]);

  // Close menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  if (error) return <p className="text-sm text-red-400 text-center py-8">{error}</p>;

  if (!data) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-stone-200/60 animate-pulse" />)}
      </div>
    );
  }

  const { student, publishedMemos, diagnosticResult } = data;
  const prevTotal =
    student.previous_rw_score != null && student.previous_math_score != null
      ? student.previous_rw_score + student.previous_math_score
      : null;

  return (
    <>
      {/* Settings menu */}
      <div className="flex justify-end mb-4" ref={menuRef}>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors px-2 py-1 rounded-lg hover:bg-stone-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
            설정
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 bg-white border border-stone-200 rounded-xl shadow-lg py-1 min-w-[140px] z-10">
              <button
                onClick={() => { setMenuOpen(false); setShowChangePasscode(true); }}
                className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
              >
                비밀번호 변경
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">

        {/* Student info */}
        <Card>
          <SectionLabel>학생 정보</SectionLabel>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-stone-400">학년</span>
            <span className="font-medium text-stone-800">{student.grade}</span>
            <span className="text-stone-400">수강 과목</span>
            <span className="font-medium text-stone-800">{student.desired_subjects}</span>
            {prevTotal != null && (
              <>
                <span className="text-stone-400">현재 점수</span>
                <span className="font-medium text-stone-800">{prevTotal}점</span>
              </>
            )}
            {student.target_score != null && (
              <>
                <span className="text-stone-400">목표 점수</span>
                <span className="font-semibold text-amber-700">{student.target_score}점</span>
              </>
            )}
            {student.target_test_date && (
              <>
                <span className="text-stone-400">목표 시험일</span>
                <span className="font-medium text-stone-800">{formatDate(student.target_test_date)}</span>
              </>
            )}
          </div>
        </Card>

        {/* Diagnostic result */}
        <Card>
          <SectionLabel>진단테스트</SectionLabel>
          {diagnosticResult ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">제출일</span>
                <span className="font-medium text-stone-800">{formatDate(diagnosticResult.submitted_at)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">소요 시간</span>
                <span className="font-medium text-stone-800">{formatDuration(diagnosticResult.total_time_seconds)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">응답 문항</span>
                <span className="font-medium text-stone-800">{diagnosticResult.question_count}문제</span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center">
              <p className="text-sm text-stone-400">아직 진단테스트를 완료하지 않았습니다.</p>
            </div>
          )}
        </Card>

        {/* Consultation timeline */}
        <Card>
          <SectionLabel>상담 기록</SectionLabel>
          {publishedMemos.length === 0 ? (
            <div className="py-2 text-center">
              <p className="text-sm text-stone-400">아직 공유된 상담 내용이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {publishedMemos.map((memo, i) => (
                <div key={memo.id}>
                  {i > 0 && <div className="border-t border-stone-100 mb-5" />}
                  <p className="text-[11px] text-stone-400 mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    {formatDate(memo.created_at)}
                  </p>
                  <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>

      {/* Passcode change modal */}
      {showChangePasscode && (
        <PasscodeChange
          token={token}
          onClose={() => setShowChangePasscode(false)}
        />
      )}
    </>
  );
}
