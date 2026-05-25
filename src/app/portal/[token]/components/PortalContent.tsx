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

const ACCENT = '#6085FF';

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
    </div>
  );
}

export default function PortalContent({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const [showChangePasscode, setShowChangePasscode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/portal/${token}/data`)
      .then(r => { if (!r.ok) throw new Error('unauthorized'); return r.json(); })
      .then(setData)
      .catch(() => setError('데이터를 불러오는 중 오류가 발생했습니다.'));
  }, [token]);

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
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    );
  }

  const { student, publishedMemos, diagnosticResult } = data;
  const prevTotal =
    student.previous_rw_score != null && student.previous_math_score != null
      ? student.previous_rw_score + student.previous_math_score : null;

  return (
    <>
      {/* Settings menu */}
      <div className="flex justify-end mb-6" ref={menuRef}>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
            설정
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 rounded-xl py-1 min-w-[140px] z-10"
              style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            >
              <button
                onClick={() => { setMenuOpen(false); setShowChangePasscode(true); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                비밀번호 변경
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">

        {/* Student info */}
        <section>
          <SectionDivider label="학생 정보" />
          <div
            className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-slate-500">학년</span>
              <span className="font-medium text-slate-200">{student.grade}</span>
              <span className="text-slate-500">수강 과목</span>
              <span className="font-medium text-slate-200">{student.desired_subjects}</span>
              {prevTotal != null && (
                <>
                  <span className="text-slate-500">현재 점수</span>
                  <span className="font-medium text-slate-200">{prevTotal}점</span>
                </>
              )}
              {student.target_score != null && (
                <>
                  <span className="text-slate-500">목표 점수</span>
                  <span className="font-bold" style={{ color: ACCENT }}>{student.target_score}점</span>
                </>
              )}
              {student.target_test_date && (
                <>
                  <span className="text-slate-500">목표 시험일</span>
                  <span className="font-medium text-slate-200">{formatDate(student.target_test_date)}</span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Diagnostic result */}
        <section>
          <SectionDivider label="진단테스트" />
          {diagnosticResult ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <div
                className="flex flex-col items-center justify-center rounded-2xl px-8 py-5 flex-1"
                style={{ background: 'rgba(96,133,255,0.1)', border: '1px solid rgba(96,133,255,0.25)' }}
              >
                <span className="text-4xl font-bold" style={{ color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>
                  {diagnosticResult.question_count}
                </span>
                <span className="text-slate-400 text-xs mt-1 uppercase tracking-widest">문항 응답</span>
              </div>
              <div
                className="flex flex-col justify-center rounded-2xl px-5 py-5 flex-[2] gap-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">제출일</span>
                  <span className="text-slate-200">{formatDate(diagnosticResult.submitted_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">소요 시간</span>
                  <span className="text-slate-200">{formatDuration(diagnosticResult.total_time_seconds)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl px-5 py-8 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-slate-500 text-sm">아직 진단테스트를 완료하지 않았습니다.</p>
            </div>
          )}
        </section>

        {/* Consultation timeline */}
        <section>
          <SectionDivider label="상담 기록" />
          {publishedMemos.length === 0 ? (
            <div
              className="rounded-2xl px-5 py-8 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-slate-500 text-sm">아직 공유된 상담 내용이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {publishedMemos.map((memo) => (
                <div
                  key={memo.id}
                  className="rounded-2xl p-5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
                    <p className="text-xs text-slate-500">{formatDate(memo.created_at)}</p>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {showChangePasscode && (
        <PasscodeChange token={token} onClose={() => setShowChangePasscode(false)} />
      )}
    </>
  );
}
