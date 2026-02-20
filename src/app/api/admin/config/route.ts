import { NextRequest, NextResponse } from 'next/server';
import { getHomeConfig, saveHomeConfig } from '@/lib/config';
import { isAuthenticated } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const config = getHomeConfig();
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        saveHomeConfig(body);
        return NextResponse.json({ success: true, config: body });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
