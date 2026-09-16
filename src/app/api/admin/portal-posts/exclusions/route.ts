import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { getPortalPostExclusions, savePortalPostExclusions } from '@/lib/config';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
        return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }
    const exclusions = await getPortalPostExclusions();
    return NextResponse.json({ excludedPostIds: exclusions[token] ?? [] });
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { portal_token?: string; post_id?: string; hidden?: boolean };
    const { portal_token, post_id, hidden } = body;

    if (!portal_token || !post_id || hidden === undefined) {
        return NextResponse.json({ error: 'portal_token, post_id, hidden are required' }, { status: 400 });
    }

    const exclusions = await getPortalPostExclusions();
    const current = new Set(exclusions[portal_token] ?? []);

    if (hidden) {
        current.add(post_id);
    } else {
        current.delete(post_id);
    }

    if (current.size === 0) {
        delete exclusions[portal_token];
    } else {
        exclusions[portal_token] = Array.from(current);
    }

    await savePortalPostExclusions(exclusions);
    return NextResponse.json({ excludedPostIds: Array.from(current) });
}
