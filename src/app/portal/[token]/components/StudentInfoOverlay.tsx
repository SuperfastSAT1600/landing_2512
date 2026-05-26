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
    <div className="flex flex-col gap-0.5 py-3.5 border-b" style={{ borderColor: '#E2E8F0' }}>
      <span className="text-xs text-slate-400">{label}</span>
      <div className="text-sm font-medium text-slate-800">{children}</div>
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
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: '#F4F5F9' }}>

      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-white" style={{ borderBottom: '1px solid #E2E8F0' }}>
        <div className="max-w-2xl mx-auto px-[6%] h-12 flex items-center">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft size={16} />
            상담 리포트
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-[6%] pt-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-6" style={{ background: ACCENT }} />
            <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: ACCENT }}>학생 기본 정보</p>
          </div>
          <h2 className="text-2xl font-bold text-slate-900" style={{ letterSpacing: '-0.02em' }}>
            {student.name} 학생
          </h2>
        </div>

        {/* Info list */}
        <div className="rounded-2xl px-5 bg-white" style={{ border: '1px solid #E2E8F0' }}>
          <InfoRow label="학년">{student.grade}</InfoRow>

          <InfoRow label="희망 과목">{student.desired_subjects}</InfoRow>

          {prevTotal != null ? (
            <InfoRow label="직전 점수">
              <span>{prevTotal}점</span>
              <span className="text-slate-400 text-xs ml-2">
                (R&W {student.previous_rw_score} / Math {student.previous_math_score})
              </span>
            </InfoRow>
          ) : (
            <InfoRow label="직전 점수"><span className="text-slate-400">—</span></InfoRow>
          )}

          {student.target_score != null ? (
            <InfoRow label="목표 점수">
              <span style={{ color: ACCENT }} className="font-bold">{student.target_score}점</span>
            </InfoRow>
          ) : (
            <InfoRow label="목표 점수"><span className="text-slate-400">—</span></InfoRow>
          )}

          {student.target_test_date ? (
            <InfoRow label="목표 시험일">
              <span>{formatDate(student.target_test_date)}</span>
              {daysLeft != null && (
                <span
                  className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={
                    daysLeft > 0
                      ? { background: 'rgba(96,133,255,0.12)', color: ACCENT }
                      : { background: 'rgba(239,68,68,0.10)', color: '#ef4444' }
                  }
                >
                  {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-Day' : `D+${Math.abs(daysLeft)}`}
                </span>
              )}
            </InfoRow>
          ) : (
            <InfoRow label="목표 시험일"><span className="text-slate-400">미정</span></InfoRow>
          )}

          <InfoRow label="수업 희망 언어">
            {student.preferred_language
              ? LANGUAGE_LABEL[student.preferred_language] ?? student.preferred_language
              : <span className="text-slate-400">—</span>
            }
          </InfoRow>
        </div>
      </div>
    </div>
  );
}
