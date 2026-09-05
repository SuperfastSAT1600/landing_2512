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
    const fontSize = title.length > 30 ? 56 : 68;

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
            padding: '64px 80px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Title line 1 — yellow */}
          <div
            style={{
              display: 'flex',
              fontSize,
              fontWeight: 800,
              color: '#fcfd00',
              lineHeight: 1.15,
              letterSpacing: '-1.5px',
              maxWidth: '1040px',
            }}
          >
            {line1}
          </div>

          {/* Title line 2 — white */}
          {line2 && (
            <div
              style={{
                display: 'flex',
                fontSize,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.15,
                letterSpacing: '-1.5px',
                maxWidth: '1040px',
                marginTop: '8px',
              }}
            >
              {line2}
            </div>
          )}

          {/* Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: '44px',
              left: '80px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#ffffff',
                opacity: 0.9,
                letterSpacing: '-0.5px',
              }}
            >
              SuperfastSAT
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '22px' }}>|</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '18px' }}>
              satmasterclass.com
            </span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
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
