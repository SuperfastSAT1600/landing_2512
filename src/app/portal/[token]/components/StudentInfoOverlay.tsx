'use client';

import { ChevronLeft } from 'lucide-react';

interface StudentInfo {
  name: string;
  grade: string;
  desired_subjects: string;
  target_score: number | null;
  target_test_date: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
}

interface Props {
  student: StudentInfo;
  onBack: () => void;
}

const ACCENT = '#6085FF';
const BG = '#09090b';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-slate-500 text-sm">{label}</span>
      <span className="font-medium text-slate-200 text-sm">{value}</span>
    </>
  );
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function StudentInfoOverlay({ student, onBack }: Props) {
  const prevTotal =
    student.previous_rw_score != null && student.previous_math_score != null
      ? student.previous_rw_score + student.previous_math_score
      : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: BG }}>
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 0%, rgba(96,133,255,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Sticky top bar */}
      <div
        className="sticky top-0 z-10"
        style={{ background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-2xl mx-auto px-[6%] h-12 flex items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
            상담 리포트
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-2xl mx-auto px-[6%] pt-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-6" style={{ background: ACCENT }} />
            <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: ACCENT }}>학생 기본 정보</p>
          </div>
          <h2 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
            {student.name} 학생
          </h2>
        </div>

        {/* Info card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="grid grid-cols-2 gap-y-4">
            <Row label="학년" value={student.grade} />
            <Row label="수강 과목" value={student.desired_subjects} />
            {prevTotal != null && (
              <Row label="현재 점수" value={`${prevTotal}점`} />
            )}
            {student.previous_rw_score != null && student.previous_math_score != null && (
              <Row
                label="R&W / Math"
                value={`${student.previous_rw_score} / ${student.previous_math_score}`}
              />
            )}
            {student.target_score != null && (
              <>
                <span className="text-slate-500 text-sm">목표 점수</span>
                <span className="font-bold text-sm" style={{ color: ACCENT }}>{student.target_score}점</span>
              </>
            )}
            {student.target_test_date && (
              <Row label="목표 시험일" value={formatDate(student.target_test_date)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
