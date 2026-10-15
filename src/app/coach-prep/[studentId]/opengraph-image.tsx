import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadGoogleFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);
    if (match) {
      const res = await fetch(match[1]);
      if (res.status === 200) return res.arrayBuffer();
    }
  } catch { /* fallback to no font */ }
  return null;
}

export default async function Image({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  const { data } = await supabaseAdmin
    .from('students')
    .select('name, grade')
    .eq('id', studentId)
    .maybeSingle();

  const name = (data as { name?: string; grade?: string } | null)?.name ?? '학생';
  const grade = (data as { name?: string; grade?: string } | null)?.grade ?? '';

  const fontText = `코치 준비 자료SuperfastSAT${name}${grade}`;
  const fontData = await loadGoogleFont(fontText);

  const fonts = fontData
    ? [{ name: 'Noto Sans KR', data: fontData, style: 'normal' as const, weight: 700 as const }]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          padding: '80px',
          fontFamily: fontData ? '"Noto Sans KR"' : 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 배경 장식 */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
          }}
        />

        {/* 브랜드 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#8b5cf6',
            }}
          />
          <span style={{ fontSize: 22, fontWeight: 700, color: '#a78bfa', letterSpacing: 1 }}>
            SuperfastSAT
          </span>
        </div>

        {/* 레이블 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: 3,
              textTransform: 'uppercase',
            }}
          >
            코치 준비 자료
          </span>
        </div>

        {/* 학생 이름 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
          <span
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: '#f8fafc',
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            {name}
          </span>
          {grade && (
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: 8,
              }}
            >
              {grade}
            </span>
          )}
        </div>

        {/* 하단 장식선 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #8b5cf6, #6366f1, transparent)',
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts,
    }
  );
}
