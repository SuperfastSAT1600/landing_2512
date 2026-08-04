import { ImageResponse } from 'next/og';
import { getCoachBySlug } from '@/lib/coaches-data';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadGoogleFont(text: string) {
    const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);
    if (match) {
        const res = await fetch(match[1]);
        if (res.status === 200) return res.arrayBuffer();
    }
    throw new Error('failed to load font');
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const coach = await getCoachBySlug(slug);

    const name = coach?.name ?? '코치';
    const fontText = `${name} 코치 대표코치 SuperfastSAT`;
    const fontData = await loadGoogleFont(fontText);

    return new ImageResponse(
        (
            <div
                style={{
                    width: 1200,
                    height: 630,
                    display: 'flex',
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#09090b',
                    fontFamily: '"Noto Sans KR"',
                }}
            >
                {coach?.photo ? (
                    <img
                        src={coach.photo}
                        alt={name}
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
                ) : (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#1f2937',
                            color: '#4b5563',
                            fontSize: 220,
                            fontWeight: 700,
                        }}
                    >
                        {name[0]}
                    </div>
                )}

                {/* Bottom gradient for name readability */}
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 280,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                        display: 'flex',
                    }}
                />

                {coach?.isHeadCoach && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 40,
                            left: 40,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 22px',
                            borderRadius: 9999,
                            background: 'rgba(0,0,0,0.7)',
                            border: '2px solid rgba(250,204,21,0.4)',
                            color: '#facc15',
                            fontSize: 32,
                            fontWeight: 700,
                        }}
                    >
                        <span>👑</span>
                        <span>대표코치</span>
                    </div>
                )}

                <div
                    style={{
                        position: 'absolute',
                        left: 56,
                        bottom: 48,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <span style={{ fontSize: 56, fontWeight: 700, color: '#ffffff' }}>{name} 코치</span>
                    <span
                        style={{
                            fontSize: 26,
                            fontWeight: 700,
                            color: '#6085FF',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            marginTop: 8,
                        }}
                    >
                        SuperfastSAT
                    </span>
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [{ name: 'Noto Sans KR', data: fontData, style: 'normal', weight: 700 }],
        }
    );
}
