'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';

interface StudentInfo {
  name: string;
  grade: string;
  desired_subjects: string;
  target_score: number | null;
  target_test_date: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function PreviewCard({
  title,
  preview,
  disabled,
  onClick,
}: {
  title: string;
  preview: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left rounded-2xl p-5 transition-colors disabled:opacity-50"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
          <p className="text-xs text-slate-400 truncate">{preview}</p>
        </div>
        {!disabled && <ChevronRight size={16} className="flex-shrink-0 text-slate-500" />}
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

  const studentPreview = [
    student.grade,
    student.target_score ? `목표 ${student.target_score}점` : null,
  ].filter(Boolean).join(' · ');

  const diagPreview = diagnosticResult
    ? `${diagnosticResult.question_count}문항 · ${formatDate(diagnosticResult.submitted_at)}`
    : '진단테스트 미완료';

  const consultPreview = publishedMemos.length > 0
    ? `총 ${publishedMemos.length}회 · 최근 ${formatDate(publishedMemos[0].created_at)}`
    : '기록 없음';

  return (
    <div>
      {/* Settings */}
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

      {/* Section label */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-px w-6" style={{ background: ACCENT }} />
        <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: ACCENT }}>리포트</p>
      </div>

      {/* 3 Cards */}
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
  );
}
