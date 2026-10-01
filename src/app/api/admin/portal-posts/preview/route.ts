import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPortalPosts } from '@/lib/config';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const name = request.nextUrl.searchParams.get('name')?.trim();
    if (!name) {
        return NextResponse.json({ error: 'name query parameter is required' }, { status: 400 });
    }

    const [studentsResult, activePosts] = await Promise.all([
        supabaseAdmin
            .from('students')
            .select('name, portal_token')
            .ilike('name', `%${name}%`)
            .limit(10),
        getPortalPosts(),
    ]);

    const students = (studentsResult.data ?? []).map(s => ({
        name: s.name as string,
        portal_token: s.portal_token as string | null,
    }));

    const filtered = activePosts
        .filter(p => p.active)
        .sort((a, b) => a.order - b.order);

    return NextResponse.json({ students, activePosts: filtered });
}
