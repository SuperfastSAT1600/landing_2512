import { supabaseAdmin } from './supabase-admin';

export interface CoachData {
    slug: string;
    name: string;
    photo: string;
    bio: string;
    introPostSlug: string;
    curriculumPostSlug: string;
    isActive: boolean;
    isHeadCoach: boolean;
    reelUrls: string[];
    subjects: string[];
    v2UserId: string | null;
}

type CoachRow = {
    slug: string;
    name: string;
    photo: string;
    bio: string;
    intro_post_slug: string;
    curriculum_post_slug: string;
    is_active: boolean;
    is_head_coach: boolean;
    reel_urls: string[] | null;
    subjects: string[] | null;
    v2_user_id: string | null;
};

function rowToCoach(row: CoachRow): CoachData {
    return {
        slug: row.slug,
        name: row.name,
        photo: row.photo,
        bio: row.bio,
        introPostSlug: row.intro_post_slug ?? '',
        curriculumPostSlug: row.curriculum_post_slug,
        isActive: row.is_active,
        isHeadCoach: row.is_head_coach ?? false,
        reelUrls: row.reel_urls ?? [],
        subjects: row.subjects ?? [],
        v2UserId: row.v2_user_id ?? null,
    };
}

export async function getCoaches(): Promise<CoachData[]> {
    const { data, error } = await supabaseAdmin
        .from('coaches')
        .select('*')
        .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(rowToCoach);
}

export async function getActiveCoaches(): Promise<CoachData[]> {
    const { data, error } = await supabaseAdmin
        .from('coaches')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(rowToCoach);
}

export async function getCoachBySlug(slug: string): Promise<CoachData | undefined> {
    const { data, error } = await supabaseAdmin
        .from('coaches')
        .select('*')
        .eq('slug', slug)
        .single();
    if (error || !data) return undefined;
    return rowToCoach(data);
}

export async function addCoach(coach: CoachData): Promise<boolean> {
    const { error } = await supabaseAdmin.from('coaches').insert({
        slug: coach.slug,
        name: coach.name,
        photo: coach.photo,
        bio: coach.bio,
        intro_post_slug: coach.introPostSlug,
        curriculum_post_slug: coach.curriculumPostSlug,
        is_active: coach.isActive,
        is_head_coach: coach.isHeadCoach ?? false,
        reel_urls: coach.reelUrls ?? [],
        subjects: coach.subjects ?? [],
        v2_user_id: coach.v2UserId ?? null,
    });
    return !error;
}

export async function updateCoach(slug: string, updates: Partial<CoachData>): Promise<boolean> {
    const dbUpdates: Partial<CoachRow> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.photo !== undefined) dbUpdates.photo = updates.photo;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.introPostSlug !== undefined) dbUpdates.intro_post_slug = updates.introPostSlug;
    if (updates.curriculumPostSlug !== undefined) dbUpdates.curriculum_post_slug = updates.curriculumPostSlug;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.isHeadCoach !== undefined) dbUpdates.is_head_coach = updates.isHeadCoach;
    if (updates.reelUrls !== undefined) dbUpdates.reel_urls = updates.reelUrls;
    if (updates.subjects !== undefined) dbUpdates.subjects = updates.subjects;
    if (updates.v2UserId !== undefined) dbUpdates.v2_user_id = updates.v2UserId;

    const { error } = await supabaseAdmin.from('coaches').update(dbUpdates).eq('slug', slug);
    return !error;
}

export async function deleteCoach(slug: string): Promise<boolean> {
    const { error } = await supabaseAdmin.from('coaches').delete().eq('slug', slug);
    return !error;
}

/**
 * 주어진 slug 목록의 코치를 조회하고, 전달된 slug 순서를 보존해 반환한다.
 * 존재하지 않거나 조회에 실패한 slug는 결과에서 제외된다.
 */
export async function getCoachesBySlugs(slugs: readonly string[]): Promise<CoachData[]> {
    if (slugs.length === 0) return [];
    const { data, error } = await supabaseAdmin
        .from('coaches')
        .select('*')
        .in('slug', slugs as string[]);
    if (error || !data) return [];
    const bySlug = new Map(data.map((row) => [row.slug as string, rowToCoach(row)]));
    return slugs.map((slug) => bySlug.get(slug)).filter((c): c is CoachData => c !== undefined);
}

export async function getCoachesBySubject(subject: string): Promise<CoachData[]> {
    const { data, error } = await supabaseAdmin
        .from('coaches')
        .select('*')
        .eq('is_active', true)
        .contains('subjects', [subject])
        .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(rowToCoach);
}
