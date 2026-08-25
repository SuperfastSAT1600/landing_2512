import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { getPortalPosts, savePortalPosts } from '@/lib/config';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as { title?: string; content?: string; active?: boolean; order?: number };
    const posts = await getPortalPosts();
    const idx = posts.findIndex(p => p.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = { ...posts[idx] };
    if (body.title !== undefined) updated.title = String(body.title).trim();
    if (body.content !== undefined) updated.content = String(body.content).trim();
    if (body.active !== undefined) updated.active = Boolean(body.active);
    if (body.order !== undefined) updated.order = Number(body.order);

    posts[idx] = updated;
    await savePortalPosts(posts);
    return NextResponse.json(updated);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const posts = await getPortalPosts();
    const filtered = posts.filter(p => p.id !== id);
    if (filtered.length === posts.length) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await savePortalPosts(filtered);
    return NextResponse.json({ success: true });
}
