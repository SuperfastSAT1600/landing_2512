import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSupertestConfig, saveSupertestConfig } from '@/lib/config';
import { isAuthenticated } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const config = await getSupertestConfig();
    return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();

    const remainingSpots = Number(body.remainingSpots);
    if (!Number.isInteger(remainingSpots) || remainingSpots < 0) {
        return NextResponse.json({ error: 'Invalid remainingSpots' }, { status: 400 });
    }

    const nextTestDate = String(body.nextTestDate ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextTestDate)) {
        return NextResponse.json({ error: 'Invalid nextTestDate (YYYY-MM-DD)' }, { status: 400 });
    }

    const testTime = String(body.testTime ?? '09:00');
    if (!/^\d{2}:\d{2}$/.test(testTime)) {
        return NextResponse.json({ error: 'Invalid testTime (HH:MM)' }, { status: 400 });
    }

    const maxFreeSlots = Number(body.maxFreeSlots ?? 10);
    if (!Number.isInteger(maxFreeSlots) || maxFreeSlots < 0) {
        return NextResponse.json({ error: 'Invalid maxFreeSlots' }, { status: 400 });
    }

    const existing = await getSupertestConfig();
    await saveSupertestConfig({
        remainingSpots,
        nextTestDate,
        testTime,
        maxFreeSlots,
        portalApplicantCount: existing.portalApplicantCount ?? 0,
    });
    revalidatePath('/supertest');
    return NextResponse.json({ success: true });
}
