import { ImageResponse } from 'next/og';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { readFileSync } from 'fs';
import path from 'path';

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

  const logoData = readFileSync(path.join(process.cwd(), 'public/logo_header.png'));
  const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.25) 0%, transparent 65%)',
        }} />

        {/* 파트너 센터 label */}
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'rgba(139,92,246,0.9)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 28,
          position: 'relative',
        }}>
          파트너 센터
        </div>

        {/* Partner name */}
        <div style={{
          fontSize: 80,
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1.1,
          textAlign: 'center',
          position: 'relative',
          letterSpacing: '-0.02em',
        }}>
          {partnerName}
        </div>

        {/* Bottom logo */}
        <div style={{
          position: 'absolute',
          bottom: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoBase64} alt="SuperfastSAT" style={{ height: 32, opacity: 0.55 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
