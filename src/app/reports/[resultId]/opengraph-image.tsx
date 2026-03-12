import { ImageResponse } from 'next/og';
import { fetchReportData } from '@/lib/report-data';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { resultId: string } }) {
  const data = await fetchReportData(params.resultId);

  const name = data?.studentName ?? 'SAT Diagnostic Report';
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
          padding: '80px 96px',
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

        {/* Label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{ height: 1, width: 40, background: '#6085FF' }} />
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#6085FF',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}
          >
            SAT Diagnostic Report · SuperfastSAT
          </span>
        </div>

        {/* Student name */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            marginBottom: 48,
          }}
        >
          {name}
        </div>

        {/* Score */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(96, 133, 255, 0.12)',
              border: '1px solid rgba(96, 133, 255, 0.3)',
              borderRadius: 20,
              padding: '28px 56px',
            }}
          >
            <span style={{ fontSize: 80, fontWeight: 700, color: '#6085FF', lineHeight: 1 }}>
              {overallPct}%
            </span>
            <span
              style={{
                fontSize: 20,
                color: '#94a3b8',
                letterSpacing: '0.15em',
                marginTop: 10,
              }}
            >
              정답률
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
