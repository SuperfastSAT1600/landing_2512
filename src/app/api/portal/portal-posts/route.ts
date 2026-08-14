import { NextResponse } from 'next/server';
import { getPortalPosts } from '@/lib/config';

export async function GET() {
    const posts = await getPortalPosts();
    const active = posts
        .filter(p => p.active)
        .sort((a, b) => a.order - b.order);
    return NextResponse.json(active);
}
