import { NextResponse } from 'next/server';
import { getHomeConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const config = await getHomeConfig();
        return NextResponse.json({
            ctaText: config.hero.ctaText,
            ctaLink: config.hero.ctaLink,
        }, {
            headers: { 'Cache-Control': 'no-cache, must-revalidate' },
        });
    } catch {
        return NextResponse.json(
            { error: 'Failed to fetch hero config' },
            { status: 500 }
        );
    }
}
