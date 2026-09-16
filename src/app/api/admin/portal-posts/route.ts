import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { getPortalPosts, savePortalPosts, type PortalPost, type PortalPostButton } from '@/lib/config';

function parseButtons(raw: unknown): PortalPostButton[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((b): b is { text: string; url: string } =>
            b && typeof b.text === 'string' && typeof b.url === 'string' &&
            b.text.trim() !== '' && b.url.trim() !== ''
        )
        .map(b => ({ text: b.text.trim(), url: b.url.trim() }))
        .slice(0, 3);
}

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

    const body = await request.json() as { title?: string; content?: string; buttons?: unknown };
    const title = String(body.title ?? '').trim();
    const content = String(body.content ?? '').trim();

    if (!title || !content) {
        return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
    }

    const buttons = parseButtons(body.buttons);

    const posts = await getPortalPosts();
    const maxOrder = posts.reduce((m, p) => Math.max(m, p.order), -1);

    const newPost: PortalPost = {
        id: crypto.randomUUID(),
        title,
        content,
        ...(buttons.length > 0 && { buttons }),
        active: true,
        order: maxOrder + 1,
        created_at: new Date().toISOString(),
    };

    await savePortalPosts([...posts, newPost]);
    return NextResponse.json(newPost, { status: 201 });
}
