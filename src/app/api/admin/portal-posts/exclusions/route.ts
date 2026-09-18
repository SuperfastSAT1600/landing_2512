import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { getPortalPostExclusions, savePortalPostExclusions } from '@/lib/config';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = request.nextUrl.searchParams.get('token');
    const postId = request.nextUrl.searchParams.get('post_id');

    if (!token && !postId) {
        return NextResponse.json({ error: 'token or post_id is required' }, { status: 400 });
    }

    const exclusions = await getPortalPostExclusions();

    // 특정 토큰의 숨긴 게시글 목록
    if (token) {
        return NextResponse.json({ excludedPostIds: exclusions[token] ?? [] });
    }

    // 특정 게시글을 숨긴 학생 목록
    const hiddenTokens = Object.entries(exclusions)
        .filter(([, ids]) => ids.includes(postId!))
        .map(([portalToken]) => portalToken);

    if (hiddenTokens.length === 0) {
        return NextResponse.json({ students: [] });
    }

    const { data } = await supabaseAdmin
        .from('students')
        .select('name, portal_token')
        .in('portal_token', hiddenTokens);

    const students = (data ?? []).map(s => ({
        name: s.name as string,
        portal_token: s.portal_token as string,
    }));

    return NextResponse.json({ students });
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
