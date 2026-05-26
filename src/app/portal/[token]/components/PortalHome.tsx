'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

interface StudentInfo {
  name: string;
  grade: string;
  desired_subjects: string;
  target_score: number | null;
  target_test_date: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
  preferred_language: 'korean' | 'english' | 'any' | null;
}

interface PublishedMemo {
  id: string;
  created_at: string;
  content: string;
}

interface DiagnosticResult {
  id: string;
  submitted_at: string;
  total_time_seconds: number;
  question_count: number;
}

interface PortalData {
  student: StudentInfo;
  publishedMemos: PublishedMemo[];
  diagnosticResult: DiagnosticResult | null;
}

type View = 'student' | 'diagnostic' | 'consultation';

interface Props {
  data: PortalData;
  onNavigate: (view: View) => void;
  onSettings: () => void;
}

const ACCENT = '#6085FF';
const BG = '#09090b';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function getDaysRemaining(iso: string): number {
  const target = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function PreviewCard({ title, preview, disabled, onClick }: {
  title: string; preview: string; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left rounded-2xl p-5 transition-colors disabled:opacity-40 bg-white hover:bg-slate-50"
      style={{ border: '1px solid #E2E8F0' }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 mb-0.5">{title}</p>
          <p className="text-xs text-slate-400 truncate">{preview}</p>
        </div>
        {!disabled && <ChevronRight size={16} className="flex-shrink-0 text-slate-400" />}
      </div>
    </button>
  );
}

export default function PortalHome({ data, onNavigate, onSettings }: Props) {
  const { student, publishedMemos, diagnosticResult } = data;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const prevTotal =
    student.previous_rw_score != null && student.previous_math_score != null
      ? student.previous_rw_score + student.previous_math_score
      : null;

  const daysLeft = student.target_test_date ? getDaysRemaining(student.target_test_date) : null;

  const diagPreview = diagnosticResult
    ? `${diagnosticResult.question_count}문항 · ${formatDate(diagnosticResult.submitted_at)}`
    : '진단테스트 미완료';

  const consultPreview = publishedMemos.length > 0
    ? `총 ${publishedMemos.length}회 · 최근 ${formatDate(publishedMemos[0].created_at)}`
    : '기록 없음';

  const studentPreview = [
    student.grade,
    student.target_score ? `목표 ${student.target_score}점` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div>
      {/* ── Dark cover section ── */}
      <div style={{ background: BG }}>
        {/* Subtle glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 15% 40%, rgba(96,133,255,0.08) 0%, transparent 55%)' }}
        />

        <div className="relative max-w-2xl mx-auto px-[6%] pt-10 pb-10">
          {/* Settings button */}
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
                    onClick={() => { setMenuOpen(false); onSettings(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    비밀번호 변경
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Label */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-10" style={{ background: ACCENT }} />
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
              상담 관리 리포트
            </p>
          </div>

          {/* Student name */}
          <h1
            className="text-white mb-2 leading-tight"
            style={{ fontSize: 'clamp(1.8rem, 6vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            {student.name} 학생
          </h1>
          <p className="text-slate-400 text-sm mb-8">{student.grade}</p>

          {/* Score cards */}
          <div className="flex flex-wrap gap-3">
            {student.target_score != null && (
              <div
                className="flex flex-col items-center justify-center rounded-2xl px-7 py-5"
                style={{ background: 'rgba(96,133,255,0.12)', border: '1px solid rgba(96,133,255,0.3)' }}
              >
                <span className="text-4xl font-bold leading-none" style={{ color: ACCENT }}>
                  {student.target_score}
                </span>
                <span className="text-slate-300 text-xs mt-1.5 uppercase tracking-widest">목표 점수</span>
                {daysLeft != null && (
                  <span className="text-xs mt-1 font-semibold" style={{ color: daysLeft > 0 ? ACCENT : '#f87171' }}>
                    {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-Day' : `D+${Math.abs(daysLeft)}`}
                  </span>
                )}
              </div>
            )}

            {prevTotal != null && (
              <div
                className="flex flex-col items-center justify-center rounded-2xl px-7 py-5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <span className="text-4xl font-bold leading-none text-white">{prevTotal}</span>
                <span className="text-slate-300 text-xs mt-1.5 uppercase tracking-widest">직전 점수</span>
                <span className="text-slate-500 text-xs mt-0.5">
                  RW {student.previous_rw_score} / Math {student.previous_math_score}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Light cards section ── */}
      <div style={{ background: '#F4F5F9' }}>
        <div className="max-w-2xl mx-auto px-[6%] py-8 pb-16">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-6" style={{ background: ACCENT }} />
            <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: ACCENT }}>리포트</p>
          </div>

          <div className="space-y-3">
            <PreviewCard
              title="학생 기본 정보"
              preview={studentPreview}
              onClick={() => onNavigate('student')}
            />
            <PreviewCard
              title="진단 테스트"
              preview={diagPreview}
              disabled={!diagnosticResult}
              onClick={() => onNavigate('diagnostic')}
            />
            <PreviewCard
              title="상담 기록"
              preview={consultPreview}
              onClick={() => onNavigate('consultation')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
