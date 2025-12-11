import { NextRequest, NextResponse } from 'next/server';
import { getHomeConfig, saveHomeConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
    try {
        const config = getHomeConfig();
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // Validation could go here
        saveHomeConfig(body);
        return NextResponse.json({ success: true, config: body });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
