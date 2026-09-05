import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

function splitTitle(title: string): [string, string] {
  const words = title.split(' ');
  if (words.length === 1) return [title, ''];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'SuperfastSAT Blog';
  const category = searchParams.get('category') || '';
  const isGhost = searchParams.get('ghost') === 'true';

  if (isGhost) {
    const line1 = searchParams.get('line1') || title;
    const line2 = searchParams.get('line2') || '';

    // Pretendard 폰트 (로컬 서빙 → 실패 시 sans-serif 폴백)
    let fontOption: { name: string; data: ArrayBuffer; style: 'normal'; weight: 800 }[] = [];
    try {
      const fontUrl = new URL('/pretendard-extrabold.otf', request.url).href;
      const fontData = await fetch(fontUrl, { signal: AbortSignal.timeout(3000) }).then(r => r.arrayBuffer());
      fontOption = [{ name: 'Pretendard', data: fontData, style: 'normal', weight: 800 }];
    } catch { /* 폴백: 기본 sans-serif */ }

    const fontFamily = fontOption.length ? 'Pretendard' : 'sans-serif';

    // 로고 (실패 시 생략)
    let logoBase64 = '';
    try {
      const logoUrl = new URL('/white-logo.png', request.url).href;
      const logoData = await fetch(logoUrl, { signal: AbortSignal.timeout(3000) }).then(r => r.arrayBuffer());
      logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`;
    } catch { /* 로고 생략 */ }

    const s = 6;
    const stroke = [
      `-${s}px -${s}px 0 #000`, `${s}px -${s}px 0 #000`,
      `-${s}px ${s}px 0 #000`, `${s}px ${s}px 0 #000`,
      `0 -${s}px 0 #000`, `0 ${s}px 0 #000`,
      `-${s}px 0 #000`, `${s}px 0 #000`,
    ].join(', ');

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#071be9',
            padding: '60px 100px 100px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 90,
              fontWeight: 800,
              fontFamily,
              color: '#fcfd00',
              letterSpacing: '-0.06em',
              lineHeight: 1.1,
              textShadow: stroke,
              textAlign: 'center',
            }}
          >
            {line1}
          </div>

          {line2 && (
            <div
              style={{
                display: 'flex',
                fontSize: 90,
                fontWeight: 800,
                fontFamily,
                color: '#ffffff',
                letterSpacing: '-0.06em',
                lineHeight: 1.1,
                textShadow: stroke,
                textAlign: 'center',
                marginTop: '10px',
              }}
            >
              {line2}
            </div>
          )}

          {logoBase64 && (
            <div
              style={{
                position: 'absolute',
                bottom: '44px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoBase64}
                alt="SuperfastSAT"
                style={{ height: '40px', objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: fontOption,
      }
    );
  }

  // 기존 스타일 (랜딩 페이지 OG 등)
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0a0b0d 0%, #151719 40%, #1a1d2e 100%)',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #6085FF, #071be9, #6085FF)',
          }}
        />

        {category && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <span
              style={{
                color: '#6085FF',
                fontSize: '20px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '3px',
              }}
            >
              {category}
            </span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            textAlign: 'center',
            fontSize: title.length > 40 ? '42px' : '52px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.3,
            maxWidth: '900px',
            wordBreak: 'break-word',
          }}
        >
          {title}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
            SuperfastSAT
          </span>
          <span style={{ color: '#4a4d52', fontSize: '24px' }}>|</span>
          <span style={{ color: '#6b7280', fontSize: '18px' }}>satmasterclass.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
