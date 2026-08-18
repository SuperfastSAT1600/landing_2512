import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthenticated } from '@/lib/server-auth';
import { generateSlug } from '@/lib/seo/slug-generator';

const RequestSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    category: z.string().optional(),
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

        const { title, category } = validation.data;
        const slug = await generateSlug(title, category);

        return NextResponse.json({ success: true, slug });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Failed to generate slug' },
            { status: 500 },
        );
    }
}
