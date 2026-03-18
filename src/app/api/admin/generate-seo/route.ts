import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthenticated } from '@/lib/server-auth';
import { generateSeoContent } from '@/lib/seo/content-generator';

const RequestSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    focusKeyword: z.string().optional(),
});

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const validation = RequestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: validation.error.issues[0].message },
                { status: 400 },
            );
        }

        const { title, content, focusKeyword } = validation.data;
        const { excerpt, description } = await generateSeoContent(title, content, focusKeyword);

        return NextResponse.json({ success: true, excerpt, description });
    } catch (err) {
        console.error('[generate-seo] Error:', err instanceof Error ? err.message : err);
        return NextResponse.json(
            { success: false, error: 'Failed to generate SEO content' },
            { status: 500 },
        );
    }
}
