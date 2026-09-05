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
    // line1/line2를 URL 파라미터로 직접 받음 (Qwen이 사전에 요약)
    const line1 = searchParams.get('line1') || title;
    const line2 = searchParams.get('line2') || '';

    // Pretendard ExtraBold 폰트 로딩
    const fontData = await fetch(
      'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-ExtraBold.otf'
    ).then(r => r.arrayBuffer());

    // 로고 로딩 (base64로 변환)
    const logoUrl = new URL('/white-logo.png', request.url).href;
    const logoData = await fetch(logoUrl).then(r => r.arrayBuffer());
    const logoBase64 = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`;

    // 검은색 외곽선 — 원본: -webkit-text-stroke 10px 재현 (다방향 textShadow)
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
          {/* 윗줄 — 노란색 */}
          <div
            style={{
              display: 'flex',
              fontSize: 90,
              fontWeight: 800,
              fontFamily: 'Pretendard',
              color: '#fcfd00',
              letterSpacing: '-0.06em',
              lineHeight: 1.1,
              textShadow: stroke,
              textAlign: 'center',
              wordBreak: 'keep-all',
            }}
          >
            {line1}
          </div>

          {/* 아랫줄 — 흰색 */}
          {line2 && (
            <div
              style={{
                display: 'flex',
                fontSize: 90,
                fontWeight: 800,
                fontFamily: 'Pretendard',
                color: '#ffffff',
                letterSpacing: '-0.06em',
                lineHeight: 1.1,
                textShadow: stroke,
                textAlign: 'center',
                wordBreak: 'keep-all',
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
              bottom: '44px',
              left: '50%',
              transform: 'translateX(-50%)',
              height: '40px',
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
