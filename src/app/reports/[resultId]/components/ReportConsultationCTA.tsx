'use client';

const CONSULT_URL = 'https://forms.gle/BsGf1bixgpr1TLNH6';

interface Props {
  variant?: 'sidebar' | 'inline';
  studentName?: string;
}

export function ReportConsultationCTA({ variant = 'sidebar', studentName }: Props) {
  if (variant === 'inline') {
    return (
      <div
        className="rounded-2xl p-8 text-center print:hidden"
        style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1B2A4A 100%)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#C9A84C' }}>
          Next Step
        </p>
        <h3 className="font-serif text-2xl font-bold text-white mb-3">
          Unlock Your Full Score Potential
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed mb-6 max-w-lg mx-auto">
          {studentName
            ? `${studentName}'s diagnostic reveals a clear path to improvement.`
            : 'This diagnostic reveals a clear path to improvement.'}{' '}
          Book a free 30-minute strategy call to receive a personalized SAT study plan built around these results.
        </p>
        <a
          href={CONSULT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
          style={{ background: '#C9A84C', color: '#0A1628' }}
        >
          Book Free Strategy Call
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <p className="text-slate-500 text-xs mt-3">No commitment · 30 minutes · Online</p>
      </div>
    );
  }

  // Sidebar variant
  return (
    <div
      className="rounded-2xl p-5 print:hidden"
      style={{ background: 'linear-gradient(160deg, #0A1628 0%, #1B2A4A 100%)' }}
    >
      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>
        Free Consultation
      </p>
      <h3 className="font-serif text-lg font-bold text-white mb-2 leading-snug">
        Get Your Personalized Study Plan
      </h3>
      <p className="text-slate-300 text-xs leading-relaxed mb-4">
        Our instructors will analyze this report and design a targeted curriculum around your weakest areas.
      </p>
      <a
        href={CONSULT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
        style={{ background: '#C9A84C', color: '#0A1628' }}
      >
        Book Free Call
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
      <p className="text-slate-500 text-xs text-center mt-2">30 min · No commitment</p>
    </div>
  );
}
