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
  preferred_language: 'korean' | 'english' | 'any' | null;
}

interface Props {
  student: StudentInfo;
  onBack: () => void;
}

const ACCENT = '#6085FF';
const BG = '#09090b';

const LANGUAGE_LABEL: Record<string, string> = {
  korean: '한국어',
  english: 'English',
  any: '상관없음',
};

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getDaysRemaining(iso: string): number {
  const target = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <span className="text-xs text-slate-500">{label}</span>
      <div className="text-sm font-medium text-slate-200">{children}</div>
    </div>
  );
}

export default function StudentInfoOverlay({ student, onBack }: Props) {
  const prevTotal =
    student.previous_rw_score != null && student.previous_math_score != null
      ? student.previous_rw_score + student.previous_math_score
      : null;

  const daysLeft = student.target_test_date ? getDaysRemaining(student.target_test_date) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: BG }}>
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(96,133,255,0.06) 0%, transparent 60%)' }}
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

        {/* Info list */}
        <div
          className="rounded-2xl px-5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <InfoRow label="학년">{student.grade}</InfoRow>

          <InfoRow label="희망 과목">{student.desired_subjects}</InfoRow>

          {prevTotal != null ? (
            <InfoRow label="직전 점수">
              <span>{prevTotal}점</span>
              <span className="text-slate-500 text-xs ml-2">
                (R&W {student.previous_rw_score} / Math {student.previous_math_score})
              </span>
            </InfoRow>
          ) : (
            <InfoRow label="직전 점수"><span className="text-slate-500">—</span></InfoRow>
          )}

          {student.target_score != null ? (
            <InfoRow label="목표 점수">
              <span style={{ color: ACCENT }} className="font-bold">{student.target_score}점</span>
            </InfoRow>
          ) : (
            <InfoRow label="목표 점수"><span className="text-slate-500">—</span></InfoRow>
          )}

          {student.target_test_date ? (
            <InfoRow label="목표 시험일">
              <span>{formatDate(student.target_test_date)}</span>
              {daysLeft != null && (
                <span
                  className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={
                    daysLeft > 0
                      ? { background: 'rgba(96,133,255,0.15)', color: ACCENT }
                      : { background: 'rgba(239,68,68,0.12)', color: '#f87171' }
                  }
                >
                  {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-Day' : `D+${Math.abs(daysLeft)}`}
                </span>
              )}
            </InfoRow>
          ) : (
            <InfoRow label="목표 시험일"><span className="text-slate-500">미정</span></InfoRow>
          )}

          <InfoRow label="수업 희망 언어">
            {student.preferred_language
              ? LANGUAGE_LABEL[student.preferred_language] ?? student.preferred_language
              : <span className="text-slate-500">—</span>
            }
          </InfoRow>
        </div>
      </div>
    </div>
  );
}
