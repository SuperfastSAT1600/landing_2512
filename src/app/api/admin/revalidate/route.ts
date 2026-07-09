import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAuthenticated } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const paths: string[] = Array.isArray(body.paths) ? body.paths : [];

    if (paths.length === 0) {
        return NextResponse.json({ success: false, error: 'paths array is required' }, { status: 400 });
    }

    for (const path of paths) {
        revalidatePath(path);
    }

    return NextResponse.json({ success: true, revalidated: paths });
}
