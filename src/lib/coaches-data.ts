import { supabaseAdmin } from './supabase';

export interface CoachData {
    slug: string;
    name: string;
    photo: string;
    bio: string;
    introPostSlug: string;
    curriculumPostSlug: string;
    isActive: boolean;
    reelUrls: string[];
}

type CoachRow = {
    slug: string;
    name: string;
    photo: string;
    bio: string;
    intro_post_slug: string;
    curriculum_post_slug: string;
    is_active: boolean;
    reel_urls: string[] | null;
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
        reelUrls: row.reel_urls ?? [],
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
        reel_urls: coach.reelUrls ?? [],
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
    if (updates.reelUrls !== undefined) dbUpdates.reel_urls = updates.reelUrls;

    const { error } = await supabaseAdmin.from('coaches').update(dbUpdates).eq('slug', slug);
    return !error;
}

export async function deleteCoach(slug: string): Promise<boolean> {
    const { error } = await supabaseAdmin.from('coaches').delete().eq('slug', slug);
    return !error;
}
