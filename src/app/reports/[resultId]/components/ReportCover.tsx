'use client';

interface Section {
  name: string;
  accuracy: number;
  correctCount: number;
  totalQuestions: number;
}

interface Props {
  studentName: string;
  submittedAt: string;
  totalTimeSeconds: number;
  sections: Section[];
  previousScoreStatus?: 'scored' | 'never_taken' | 'dont_remember';
  previousTestDate?: string;
  previousRwScore?: number;
  previousMathScore?: number;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function scrollToReport() {
  document.getElementById('section-01')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function ReportCover({ studentName, submittedAt, totalTimeSeconds, sections, previousScoreStatus, previousTestDate, previousRwScore, previousMathScore }: Props) {
  const totalCorrect = sections.reduce((a, s) => a + s.correctCount, 0);
  const totalQuestions = sections.reduce((a, s) => a + s.totalQuestions, 0);
  const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const dateStr = new Date(submittedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="relative overflow-hidden print:hidden"
      style={{ background: '#09090b' }}
    >
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #6085FF 0%, transparent 50%), radial-gradient(circle at 80% 20%, #071be9 0%, transparent 40%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-[6%] py-10 sm:py-16">
        {/* Label */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 max-w-[40px]" style={{ background: '#6085FF' }} />
          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#6085FF' }}>
            SAT Diagnostic Report
          </p>
        </div>

        {/* Student name */}
        <h1
          className="text-white mb-2 leading-tight"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(2rem, 6vw, 4.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          {studentName}
        </h1>

        {/* Subheadline */}
        <p className="text-slate-400 text-base mb-4">
          Completed {dateStr} · {formatTime(totalTimeSeconds)}
        </p>

        {/* Previous SAT score (shown only when student entered scores) */}
        {previousScoreStatus === 'scored' && previousRwScore && previousMathScore && (
          <div className="inline-flex items-center gap-3 mb-8 px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-slate-400 text-sm">Previous SAT</span>
            <span className="text-white text-sm font-semibold">
              R&amp;W {previousRwScore} / Math {previousMathScore}
              {previousTestDate && (
                <span className="text-slate-400 font-normal ml-1">
                  ({new Date(previousTestDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                </span>
              )}
            </span>
            <span className="text-slate-500 text-xs">= {previousRwScore + previousMathScore} total</span>
          </div>
        )}

        {/* Score row */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6">
          {/* Overall */}
          <div
            className="flex flex-col items-center justify-center rounded-2xl px-8 py-5"
            style={{ background: 'rgba(96, 133, 255, 0.12)', border: '1px solid rgba(96, 133, 255, 0.3)' }}
          >
            <span
              className="text-5xl font-bold leading-none"
              style={{ color: '#6085FF', fontFamily: 'var(--font-sans)' }}
            >
              {overallPct}%
            </span>
            <span className="text-slate-300 text-xs mt-1 uppercase tracking-widest">Overall</span>
            <span className="text-slate-500 text-xs">{totalCorrect}/{totalQuestions} correct</span>
          </div>

          {/* Per section */}
          {sections.map((section) => {
            const pct = Math.round(section.accuracy * 100);
            const label = section.name === 'Reading and Writing' ? 'R&W' : section.name;
            return (
              <div
                key={section.name}
                className="flex flex-col items-center justify-center rounded-2xl px-6 py-5"
                style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <span
                  className="text-4xl font-bold leading-none text-white"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  {pct}%
                </span>
                <span className="text-slate-300 text-xs mt-1 uppercase tracking-widest">{label}</span>
                <span className="text-slate-500 text-xs">{section.correctCount}/{section.totalQuestions}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll hint */}
      <div className="relative flex justify-center pb-8 pt-6">
        <button
          onClick={scrollToReport}
          className="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span className="text-slate-400 text-xs tracking-widest uppercase">리포트 보기</span>
          <svg
            className="animate-bounce"
            width="20" height="20" viewBox="0 0 20 20" fill="none"
          >
            <path d="M10 4v12M4 10l6 6 6-6" stroke="#6085FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
