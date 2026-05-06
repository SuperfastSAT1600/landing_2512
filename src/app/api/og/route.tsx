import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'SuperfastSAT Blog';
    const category = searchParams.get('category') || '';

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
                {/* Top bar */}
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

                {/* Category badge */}
                {category && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '24px',
                        }}
                    >
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

                {/* Title */}
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

                {/* Branding */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    <span
                        style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            color: '#ffffff',
                            letterSpacing: '-0.5px',
                        }}
                    >
                        SuperfastSAT
                    </span>
                    <span style={{ color: '#4a4d52', fontSize: '24px' }}>|</span>
                    <span style={{ color: '#6b7280', fontSize: '18px' }}>
                        satmasterclass.com
                    </span>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        },
    );
}
