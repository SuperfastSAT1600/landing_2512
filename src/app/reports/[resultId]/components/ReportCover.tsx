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
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function ReportCover({ studentName, submittedAt, totalTimeSeconds, sections }: Props) {
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
      style={{
        background: 'linear-gradient(160deg, #0A1628 0%, #0F2040 60%, #1B2A4A 100%)',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #C9A84C 0%, transparent 50%), radial-gradient(circle at 80% 20%, #4A6FA5 0%, transparent 40%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 sm:px-10 py-16">
        {/* Label */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 max-w-[40px]" style={{ background: '#C9A84C' }} />
          <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#C9A84C' }}>
            SAT Diagnostic Report
          </p>
        </div>

        {/* Student name */}
        <h1
          className="text-white mb-2 leading-tight"
          style={{
            fontFamily: 'var(--font-playfair, Georgia, serif)',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          {studentName}
        </h1>

        {/* Subheadline */}
        <p className="text-slate-400 text-base mb-12">
          Completed {dateStr} · {formatTime(totalTimeSeconds)}
        </p>

        {/* Score row */}
        <div className="flex flex-wrap gap-6">
          {/* Overall */}
          <div
            className="flex flex-col items-center justify-center rounded-2xl px-8 py-5"
            style={{ background: 'rgba(201, 168, 76, 0.12)', border: '1px solid rgba(201, 168, 76, 0.3)' }}
          >
            <span
              className="text-5xl font-bold leading-none"
              style={{
                fontFamily: 'var(--font-playfair, Georgia, serif)',
                color: '#C9A84C',
              }}
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
                  style={{ fontFamily: 'var(--font-playfair, Georgia, serif)' }}
                >
                  {pct}%
                </span>
                <span className="text-slate-300 text-xs mt-1 uppercase tracking-widest">{label}</span>
                <span className="text-slate-500 text-xs">{section.correctCount}/{section.totalQuestions}</span>
              </div>
            );
          })}
        </div>

        {/* Bottom divider */}
        <div className="mt-12 h-px" style={{ background: 'linear-gradient(to right, rgba(201,168,76,0.4), transparent)' }} />
        <p className="text-slate-600 text-xs mt-3">
          SuperfastSAT · Confidential Diagnostic Assessment
        </p>
      </div>
    </div>
  );
}
