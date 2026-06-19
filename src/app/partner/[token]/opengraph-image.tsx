import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data } = await supabaseAdmin
    .from('partner_portals')
    .select('name')
    .eq('token', token)
    .single();

  const partnerName = data?.name ?? '파트너 센터';

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#4F46E5',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0 100px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 80% 20%, rgba(99,102,241,0.6) 0%, transparent 50%), radial-gradient(circle at 10% 80%, rgba(67,56,202,0.8) 0%, transparent 50%)',
          }}
        />

        {/* SuperfastSAT label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 48,
            position: 'relative',
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            SuperfastSAT
          </span>
        </div>

        {/* Partner name */}
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            marginBottom: 24,
            position: 'relative',
          }}
        >
          {partnerName}
        </div>

        {/* 파트너 센터 label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 4,
              height: 28,
              background: 'rgba(255,255,255,0.5)',
              borderRadius: 2,
            }}
          />
          <span
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            파트너 센터
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
