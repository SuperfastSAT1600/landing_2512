'use client';

const ACCENT = '#6085FF';
const BG = '#09090b';

const SAT_DATES = [
  '2026-06-06', '2026-08-22', '2026-09-12', '2026-10-03', '2026-11-07', '2026-12-05',
  '2027-03-06', '2027-05-01', '2027-06-05',
  '2027-08-28', '2027-09-18', '2027-10-02', '2027-11-06', '2027-12-04',
  '2028-03-04', '2028-05-06', '2028-06-03',
];

const LANGUAGE_LABEL: Record<string, string> = {
  korean: '한국어', english: 'English', any: '상관없음',
};

interface StudentInfo {
  name: string;
  grade: string;
  desired_subjects: string;
  target_score: number | null;
  target_test_date: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
  preferred_language: 'korean' | 'english' | 'any' | null;
  created_at: string | null;
}

function daysLeft(iso: string): number {
  const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
}

function dDayLabel(days: number) {
  return days > 0 ? `D-${days}` : days === 0 ? 'D-Day' : `D+${Math.abs(days)}`;
}

function formatKo(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatMonthDay(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function getNextSatDates(): { date: string; days: number }[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return SAT_DATES
    .map(date => ({ date, days: Math.ceil((new Date(date + 'T00:00:00').getTime() - today.getTime()) / 86_400_000) }))
    .filter(d => d.days >= 0);
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3.5 border-b" style={{ borderColor: '#E2E8F0' }}>
      <span className="text-xs text-slate-400">{label}</span>
      <div className="text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

export default function StudentInfoOverlay({ student }: { student: StudentInfo }) {
  const prevTotal = student.previous_rw_score != null && student.previous_math_score != null
    ? student.previous_rw_score + student.previous_math_score : null;

  const targetDays = student.target_test_date ? daysLeft(student.target_test_date) : null;
  const upcomingSat = getNextSatDates();
  const nextSat = upcomingSat[0] ?? null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto pt-12" style={{ background: '#F4F5F9' }}>

      {/* Dark cover */}
      <div className="relative overflow-hidden" style={{ background: BG }}>
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #6085FF 0%, transparent 50%), radial-gradient(circle at 80% 20%, #071be9 0%, transparent 40%)',
        }} />
        <div className="relative max-w-5xl mx-auto px-[6%] py-10 sm:py-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 max-w-[40px]" style={{ background: ACCENT }} />
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>학생 기본 정보</p>
          </div>
          <h1 className="text-white mb-1 leading-tight"
            style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {student.name} 학생
          </h1>
          {student.created_at && (
            <p className="text-slate-400 text-sm mb-8">
              {new Date(student.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 시작
            </p>
          )}

          {/* 2 cards — horizontal on all screen sizes */}
          <div className="flex flex-row gap-3">
            {/* 직전 점수 */}
            <div className="flex-1 flex flex-col items-center justify-center rounded-2xl px-4 py-5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-4xl font-bold leading-none text-white">{prevTotal ?? '—'}</span>
              <span className="text-slate-300 text-xs mt-1.5 uppercase tracking-widest">직전 점수</span>
              {prevTotal != null && (
                <span className="text-slate-500 text-xs mt-0.5">RW {student.previous_rw_score} / Math {student.previous_math_score}</span>
              )}
            </div>

            {/* 목표 점수 */}
            <div className="flex-1 flex flex-col items-center justify-center rounded-2xl px-4 py-5"
              style={{ background: 'rgba(96,133,255,0.12)', border: '1px solid rgba(96,133,255,0.3)' }}>
              <span className="text-5xl font-bold leading-none" style={{ color: ACCENT }}>{student.target_score ?? '—'}</span>
              <span className="text-slate-300 text-xs mt-1.5 uppercase tracking-widest">목표 점수</span>
              {targetDays != null && (
                <span className="text-xs mt-1 font-semibold" style={{ color: targetDays >= 0 ? ACCENT : '#f87171' }}>
                  {dDayLabel(targetDays)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Light section */}
      <div style={{ background: '#F4F5F9' }}>
        <div className="max-w-5xl mx-auto px-[6%] py-8 pb-16 space-y-6">

          {/* Next SAT D-Day */}
          {nextSat && (
            <div className="rounded-2xl px-5 py-5 bg-white" style={{ border: '1px solid #E2E8F0' }}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">다음 SAT 시험</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{formatKo(nextSat.date)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">College Board 공식 일정</p>
                </div>
                <span
                  className="text-2xl font-bold"
                  style={{ color: nextSat.days <= 14 ? '#ef4444' : ACCENT }}
                >
                  {dDayLabel(nextSat.days)}
                </span>
              </div>
            </div>
          )}

          {/* Student info */}
          <div className="rounded-2xl px-5 bg-white" style={{ border: '1px solid #E2E8F0' }}>
            <InfoRow label="학년">{student.grade}</InfoRow>
            <InfoRow label="희망 과목">{student.desired_subjects || '—'}</InfoRow>
            <InfoRow label="수업 희망 언어">
              {student.preferred_language ? LANGUAGE_LABEL[student.preferred_language] ?? student.preferred_language : <span className="text-slate-400">—</span>}
            </InfoRow>
            <InfoRow label="직전 점수">
              {prevTotal != null
                ? <>{prevTotal}점 <span className="text-slate-400 text-xs ml-1">(R&W {student.previous_rw_score} / Math {student.previous_math_score})</span></>
                : <span className="text-slate-400">—</span>}
            </InfoRow>
            <InfoRow label="목표 점수">
              {student.target_score != null
                ? <span style={{ color: ACCENT }} className="font-bold">{student.target_score}점</span>
                : <span className="text-slate-400">—</span>}
            </InfoRow>
            <InfoRow label="목표 시험일">
              {student.target_test_date
                ? <>{formatKo(student.target_test_date)}{targetDays != null && (
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={targetDays >= 0 ? { background: 'rgba(96,133,255,0.12)', color: ACCENT } : { background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                      {dDayLabel(targetDays)}
                    </span>
                  )}</>
                : <span className="text-slate-400">미정</span>}
            </InfoRow>
          </div>

          {/* Upcoming SAT dates */}
          <div className="rounded-2xl px-5 bg-white" style={{ border: '1px solid #E2E8F0' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 pt-4 pb-3">SAT 시험 일정</p>
            <div className="space-y-0">
              {upcomingSat.slice(0, 10).map(({ date, days }) => (
                <div key={date} className="flex items-center justify-between py-2.5 border-b last:border-b-0" style={{ borderColor: '#F1F5F9' }}>
                  <span className="text-sm text-slate-700">{formatMonthDay(date)}</span>
                  <span className="text-xs font-semibold tabular-nums"
                    style={{ color: days <= 30 ? '#ef4444' : days <= 90 ? ACCENT : '#94a3b8' }}>
                    {dDayLabel(days)}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
