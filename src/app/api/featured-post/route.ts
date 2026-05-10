import { NextResponse } from 'next/server';
import { getHomeConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const config = await getHomeConfig();
        const { discountLabel, discountPostSlug } = config.floatingCta;

        if (!discountPostSlug) {
            return NextResponse.json({ success: true, discount: null });
        }

        return NextResponse.json({
            success: true,
            discount: { label: discountLabel, slug: discountPostSlug },
        });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to fetch config' }, { status: 500 });
    }
}
