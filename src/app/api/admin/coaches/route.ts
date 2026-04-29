import { NextRequest, NextResponse } from 'next/server';
import {
    getCoaches,
    addCoach,
    updateCoach,
    deleteCoach,
    CoachData,
} from '@/lib/coaches-data';
import { isAuthenticated } from '@/lib/server-auth';

/** GET /api/admin/coaches — return full coach list (admin only). */
export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const coaches = getCoaches();
        return NextResponse.json({ success: true, coaches });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to fetch coaches' }, { status: 500 });
    }
}

/** POST /api/admin/coaches — create a new coach. Requires slug and name. */
export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body: Partial<CoachData> = await request.json();

        if (!body.slug || !body.name) {
            return NextResponse.json(
                { success: false, error: 'slug and name are required' },
                { status: 400 }
            );
        }

        const existing = getCoaches().find(c => c.slug === body.slug);
        if (existing) {
            return NextResponse.json(
                { success: false, error: `Coach with slug "${body.slug}" already exists` },
                { status: 409 }
            );
        }

        const newCoach: CoachData = {
            slug: body.slug,
            name: body.name,
            photo: body.photo ?? '',
            bio: body.bio ?? '',
            curriculumPostSlug: body.curriculumPostSlug ?? '',
            isActive: body.isActive ?? true,
        };

        addCoach(newCoach);
        return NextResponse.json({ success: true, coach: newCoach }, { status: 201 });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to create coach' }, { status: 500 });
    }
}

/** PATCH /api/admin/coaches — update a coach by slug. */
export async function PATCH(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body: Partial<CoachData> = await request.json();
        const { slug, ...updates } = body;

        if (!slug) {
            return NextResponse.json({ success: false, error: 'slug is required' }, { status: 400 });
        }

        const { name, photo, bio, curriculumPostSlug, isActive } = updates;
        const safeUpdates: Partial<CoachData> = {};
        if (name !== undefined) safeUpdates.name = name;
        if (photo !== undefined) safeUpdates.photo = photo;
        if (bio !== undefined) safeUpdates.bio = bio;
        if (curriculumPostSlug !== undefined) safeUpdates.curriculumPostSlug = curriculumPostSlug;
        if (isActive !== undefined) safeUpdates.isActive = isActive;

        const updated = updateCoach(slug, safeUpdates);
        if (!updated) {
            return NextResponse.json({ success: false, error: 'Coach not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to update coach' }, { status: 500 });
    }
}

/** DELETE /api/admin/coaches?slug=jimmy — delete a coach by slug. */
export async function DELETE(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return NextResponse.json({ success: false, error: 'slug query param is required' }, { status: 400 });
        }

        const deleted = deleteCoach(slug);
        if (!deleted) {
            return NextResponse.json({ success: false, error: 'Coach not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to delete coach' }, { status: 500 });
    }
}
