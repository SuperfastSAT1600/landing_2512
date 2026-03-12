import { ImageResponse } from 'next/og';
import { fetchReportData } from '@/lib/report-data';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { resultId: string } }) {
  const data = await fetchReportData(params.resultId);

  const raw = data?.studentName ?? '—';
  const name = raw.length > 3 ? raw.slice(0, 3) + '**' : raw;
  const totalCorrect = data?.sections.reduce((sum, s) => sum + s.correctCount, 0) ?? 0;
  const totalQuestions = data?.sections.reduce((sum, s) => sum + s.totalQuestions, 0) ?? 0;
  const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0 120px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient — matches ReportCover */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.25,
            background:
              'radial-gradient(circle at 20% 50%, #6085FF 0%, transparent 50%), radial-gradient(circle at 80% 20%, #071be9 0%, transparent 40%)',
          }}
        />

        {/* SAT Diagnostic Report */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#6085FF',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: 36,
          }}
        >
          SAT Diagnostic Report
        </div>

        {/* 학생이름  00%  00/00 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 40,
            flexWrap: 'nowrap',
          }}
        >
          <span
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#6085FF',
              lineHeight: 1,
            }}
          >
            {overallPct}%
          </span>
          <span
            style={{
              fontSize: 52,
              fontWeight: 600,
              color: '#94a3b8',
              lineHeight: 1,
            }}
          >
            {totalCorrect}/{totalQuestions}
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
