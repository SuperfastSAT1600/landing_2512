import { NextRequest, NextResponse } from 'next/server';
import { getCoaches, addCoach, updateCoach, deleteCoach, CoachData } from '@/lib/coaches-data';
import { isAuthenticated } from '@/lib/server-auth';
import { isValidInstagramUrl } from '@/lib/instagram-url';

export async function GET(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const coaches = await getCoaches();
        return NextResponse.json({ success: true, coaches });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to fetch coaches' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body: Partial<CoachData> = await request.json();
        if (!body.slug || !body.name) {
            return NextResponse.json({ success: false, error: 'slug and name are required' }, { status: 400 });
        }

        const newCoach: CoachData = {
            slug: body.slug,
            name: body.name,
            photo: body.photo ?? '',
            bio: body.bio ?? '',
            introPostSlug: body.introPostSlug ?? '',
            curriculumPostSlug: body.curriculumPostSlug ?? '',
            isActive: body.isActive ?? true,
            reelUrls: Array.isArray(body.reelUrls)
                ? body.reelUrls.filter((u: string) => isValidInstagramUrl(u))
                : [],
            subjects: Array.isArray(body.subjects) ? body.subjects : [],
            isHeadCoach: body.isHeadCoach ?? false,
            v2UserId: body.v2UserId ?? null,
        };

        const ok = await addCoach(newCoach);
        if (!ok) {
            return NextResponse.json({ success: false, error: 'slug already exists or DB error' }, { status: 409 });
        }
        return NextResponse.json({ success: true, coach: newCoach }, { status: 201 });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to create coach' }, { status: 500 });
    }
}

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
        const safeUpdates: Partial<CoachData> = {};
        if (updates.name !== undefined) safeUpdates.name = updates.name;
        if (updates.photo !== undefined) safeUpdates.photo = updates.photo;
        if (updates.bio !== undefined) safeUpdates.bio = updates.bio;
        if (updates.introPostSlug !== undefined) safeUpdates.introPostSlug = updates.introPostSlug;
        if (updates.curriculumPostSlug !== undefined) safeUpdates.curriculumPostSlug = updates.curriculumPostSlug;
        if (updates.isActive !== undefined) safeUpdates.isActive = updates.isActive;
        if (updates.reelUrls !== undefined) {
            if (!Array.isArray(updates.reelUrls)) {
                return NextResponse.json({ success: false, error: 'reelUrls must be an array' }, { status: 400 });
            }
            const invalid = updates.reelUrls.filter((u: string) => u && !isValidInstagramUrl(u));
            if (invalid.length > 0) {
                return NextResponse.json(
                    { success: false, error: `Invalid Instagram URLs: ${invalid.join(', ')}` },
                    { status: 400 }
                );
            }
            safeUpdates.reelUrls = updates.reelUrls;
        }
        if (updates.subjects !== undefined) {
            if (!Array.isArray(updates.subjects)) {
                return NextResponse.json({ success: false, error: 'subjects must be an array' }, { status: 400 });
            }
            const validSubjects = ['SAT', 'AP'];
            const invalid = (updates.subjects as string[]).filter((s: string) => !validSubjects.includes(s));
            if (invalid.length > 0) {
                return NextResponse.json(
                    { success: false, error: `Invalid subjects: ${invalid.join(', ')}` },
                    { status: 400 }
                );
            }
            safeUpdates.subjects = updates.subjects;
        }
        if (updates.isHeadCoach !== undefined) safeUpdates.isHeadCoach = updates.isHeadCoach;
        if ('v2UserId' in updates) safeUpdates.v2UserId = updates.v2UserId ?? null;
        const ok = await updateCoach(slug, safeUpdates);
        if (!ok) {
            return NextResponse.json({ success: false, error: 'Coach not found or DB error' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to update coach' }, { status: 500 });
    }
}

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
        const ok = await deleteCoach(slug);
        if (!ok) {
            return NextResponse.json({ success: false, error: 'Coach not found or DB error' }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to delete coach' }, { status: 500 });
    }
}
