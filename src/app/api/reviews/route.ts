import { NextRequest, NextResponse } from 'next/server';
import { getReviews, addReview, updateReview, deleteReview, ReviewData } from '@/lib/reviews-data';
// using local generateId helper instead of uuid package


// Helper for simple ID if UUID package issue
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function GET(request: NextRequest) {
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

        // Basic Validation
        if (!body.marketingConsent) {
            return NextResponse.json({ success: false, error: 'Marketing consent required' }, { status: 400 });
        }

        const newReview: ReviewData = {
            id: generateId(),
            title: body.title || '무제',
            category: body.category || '기타',
            author: body.author || 'Anonymous',
            authorType: body.authorType || 'Student',
            grade: body.grade || '',
            rating: body.rating || 5,
            content: body.content || '',
            date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
            marketingConsent: body.marketingConsent,
            rewardType: body.rewardType || 'Reward',
            contact: body.contact || '',
            status: 'pending', // Default to pending
            isFeatured: false
        };

        addReview(newReview);
        return NextResponse.json({ success: true, review: newReview });

    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to submit review' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
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
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

        const updated = updateReview(id, updates);
        return NextResponse.json({ success: updated });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
