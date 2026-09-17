import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const size = { width: 1024, height: 537 };
export const contentType = 'image/png';

const logoData = readFileSync(join(process.cwd(), 'public/white-logo.png'));
const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1024,
          height: 537,
          background: '#1400FF',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.02em',
          }}
        >
          Math Web
        </div>

        <img
          src={logoSrc}
          width={285}
          height={36}
          alt=""
          style={{ position: 'absolute', bottom: 40 }}
        />
      </div>
    ),
    { ...size },
  );
}
