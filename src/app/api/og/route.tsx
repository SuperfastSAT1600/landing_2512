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
    const [line1, line2] = splitTitle(title);

    // Pretendard ExtraBold 폰트 로딩
    const fontData = await fetch(
      'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-ExtraBold.otf'
    ).then(r => r.arrayBuffer());

    // 로고 로딩 (base64로 변환)
    const logoUrl = new URL('/white-logo.png', request.url).href;
    const logoData = await fetch(logoUrl).then(r => r.arrayBuffer());
    const logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`;

    // 검은색 외곽선 — textShadow 4방향
    const stroke = '-3px 0 #000, 3px 0 #000, 0 -3px #000, 0 3px #000, -2px -2px #000, 2px -2px #000, -2px 2px #000, 2px 2px #000';

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            background: '#071be9',
            padding: '60px 80px 100px',
          }}
        >
          {/* 윗줄 — 노란색 */}
          <div
            style={{
              display: 'flex',
              fontSize: 85,
              fontWeight: 800,
              fontFamily: 'Pretendard',
              color: '#fcfd00',
              letterSpacing: '-5px',
              lineHeight: 1.1,
              textShadow: stroke,
            }}
          >
            {line1}
          </div>

          {/* 아랫줄 — 흰색 */}
          {line2 && (
            <div
              style={{
                display: 'flex',
                fontSize: 85,
                fontWeight: 800,
                fontFamily: 'Pretendard',
                color: '#ffffff',
                letterSpacing: '-5px',
                lineHeight: 1.1,
                textShadow: stroke,
                marginTop: '10px',
              }}
            >
              {line2}
            </div>
          )}

          {/* 하단 중앙 로고 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoBase64}
            alt="SuperfastSAT"
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              height: '52px',
              objectFit: 'contain',
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [{ name: 'Pretendard', data: fontData, style: 'normal', weight: 800 }],
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
