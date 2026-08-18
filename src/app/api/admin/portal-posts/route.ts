import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { getPortalPosts, savePortalPosts, type PortalPost } from '@/lib/config';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const posts = await getPortalPosts();
    return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { title?: string; content?: string };
    const title = String(body.title ?? '').trim();
    const content = String(body.content ?? '').trim();

    if (!title || !content) {
        return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
    }

    const posts = await getPortalPosts();
    const maxOrder = posts.reduce((m, p) => Math.max(m, p.order), -1);

    const newPost: PortalPost = {
        id: crypto.randomUUID(),
        title,
        content,
        active: true,
        order: maxOrder + 1,
        created_at: new Date().toISOString(),
    };

    await savePortalPosts([...posts, newPost]);
    return NextResponse.json(newPost, { status: 201 });
}
