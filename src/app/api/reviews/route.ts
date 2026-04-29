import { NextRequest, NextResponse } from 'next/server';
import { getReviews, addReview, updateReview, deleteReview, ReviewData } from '@/lib/reviews-data';
import { isAuthenticated } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const reviews = getReviews();
        return NextResponse.json({ success: true, reviews });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.marketingConsent) {
            return NextResponse.json({ success: false, error: 'Marketing consent required' }, { status: 400 });
        }

        const newReview: ReviewData = {
            id: crypto.randomUUID(),
            title: body.title || '무제',
            category: body.category || '기타',
            author: body.author || 'Anonymous',
            authorType: body.authorType || 'Student',
            grade: body.grade || '',
            rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
            content: body.content || '',
            date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
            marketingConsent: true,
            rewardType: body.rewardType || 'Reward',
            contact: body.contact || '',
            status: 'pending',
            isFeatured: false,
            ...(body.coachSlug ? { coachSlug: String(body.coachSlug) } : {}),
        };

        addReview(newReview);
        return NextResponse.json({ success: true, review: newReview });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to submit review' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        const deleted = deleteReview(id);
        return NextResponse.json({ success: deleted });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        // Only allow updating specific safe fields
        const allowedFields: (keyof ReviewData)[] = ['status', 'isFeatured', 'title', 'content'];
        const safeUpdates: Partial<ReviewData> = {};
        for (const field of allowedFields) {
            if (field in updates) safeUpdates[field] = updates[field];
        }

        const updated = updateReview(id, safeUpdates);
        return NextResponse.json({ success: updated });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
