import { NextResponse } from 'next/server';
import { getHomeConfig } from '@/lib/config';

export async function GET() {
    try {
        const config = await getHomeConfig();
        const { discountLabel, discountPostSlug } = config.floatingCta;

        const cacheHeaders = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' };

        if (!discountPostSlug) {
            return NextResponse.json({ success: true, discount: null }, { headers: cacheHeaders });
        }

        return NextResponse.json({
            success: true,
            discount: { label: discountLabel, slug: discountPostSlug },
        }, { headers: cacheHeaders });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to fetch config' }, { status: 500 });
    }
}
