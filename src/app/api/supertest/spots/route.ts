import { NextResponse } from 'next/server';
import { getSupertestConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
    const config = await getSupertestConfig();
    return NextResponse.json(
        { remainingSpots: config.remainingSpots, nextTestDate: config.nextTestDate },
        { headers: { 'Cache-Control': 'no-cache, must-revalidate' } }
    );
}
