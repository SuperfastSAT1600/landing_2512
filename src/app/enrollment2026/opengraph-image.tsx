import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadGoogleFont() {
  const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&text=${encodeURIComponent('SuperfastSAT아이에게딱맞는수업을받아보세요SAT목표점수가장빠르게')}`;
  const css = await (await fetch(url)).text();
  const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);
  if (match) {
    const res = await fetch(match[1]);
    if (res.status === 200) return res.arrayBuffer();
  }
  throw new Error('failed to load font');
}

export default async function Image() {
  const fontData = await loadGoogleFont();
  const bgUrl = 'https://img.youtube.com/vi/3_FyzliFEbw/maxresdefault.jpg';

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '"Noto Sans KR"',
        }}
      >
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bgUrl}
          alt=""
          width={1200}
          height={630}
          style={{
            position: 'absolute',
            inset: 0,
            width: 1200,
            height: 630,
            objectFit: 'cover',
          }}
        />

        {/* Dark gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(10,10,16,0.88) 0%, rgba(10,10,24,0.72) 60%, rgba(10,10,16,0.60) 100%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 80px',
          }}
        >
          {/* Brand badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 32,
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                borderRadius: 999,
                padding: '8px 24px',
                color: 'rgba(255,255,255,0.85)',
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              SuperfastSAT
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              color: '#ffffff',
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: 24,
            }}
          >
            <span>SAT 목표 점수에</span>
            <span>가장 빠르게.</span>
          </div>

          {/* Sub */}
          <div
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            아이에게 딱 맞는 수업을 받아보세요
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Noto Sans KR', data: fontData, style: 'normal', weight: 700 }],
    }
  );
}
