import { NextRequest, NextResponse } from 'next/server';
import { postExists } from '@/lib/posts';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const exists = await postExists(slug);
    return NextResponse.json({ exists });
}
