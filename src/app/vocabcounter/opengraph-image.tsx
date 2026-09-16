import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
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
        {/* 배경 그라디언트 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.2,
            background:
              'radial-gradient(circle at 20% 50%, #6085FF 0%, transparent 50%), radial-gradient(circle at 80% 20%, #071be9 0%, transparent 45%)',
          }}
        />

        {/* 시크릿 페이지 레이블 */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#6085FF',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          시크릿 페이지
        </div>

        {/* 페이지 이름 */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: 28,
          }}
        >
          Vocab Counter
        </div>

        {/* 설명 */}
        <div
          style={{
            fontSize: 28,
            color: '#94a3b8',
            fontWeight: 400,
          }}
        >
          외우려는 그 단어, SAT문제에 얼마나 나오는지 확인하세요
        </div>

        {/* 우측 하단 로고 텍스트 */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            right: 120,
            fontSize: 18,
            color: '#3f3f46',
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}
        >
          SuperfastSAT
        </div>
      </div>
    ),
    { ...size },
  );
}
