import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getHomeConfig, saveHomeConfig } from '@/lib/config';
import { isAuthenticated } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const config = await getHomeConfig();
        return NextResponse.json(config);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        await saveHomeConfig(body);
        revalidatePath('/');
        return NextResponse.json({ success: true, config: body });
    } catch {
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
