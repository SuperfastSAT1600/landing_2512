import { NextRequest, NextResponse } from 'next/server';
import { getPortalPosts, getPortalPostExclusions } from '@/lib/config';

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token') ?? '';

    const [posts, exclusions] = await Promise.all([
        getPortalPosts(),
        token ? getPortalPostExclusions() : Promise.resolve({} as Record<string, string[]>),
    ]);

    const excluded = new Set(token ? (exclusions[token] ?? []) : []);

    const active = posts
        .filter(p => p.active && !excluded.has(p.id))
        .sort((a, b) => a.order - b.order);

    return NextResponse.json(active);
}
