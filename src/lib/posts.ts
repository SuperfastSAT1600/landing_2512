import { unstable_cache } from 'next/cache';
import { supabase } from './supabase';
import { remark } from 'remark';
import html from 'remark-html';

export interface PostData {
    id: string;
    date: string;
    title: string;
    category: string;
    excerpt?: string;
    featuredImage?: string;
    featuredImageAlt?: string;
    featureImage?: string;
    focusKeyword?: string;
    description?: string;
    author?: string;
    tags?: string[];
    contentHtml?: string;
    ctaFeatured?: boolean;
    metaTitle?: string;
    metaRobots?: string;
    updatedAt?: string;
    isGated?: boolean;
    isVip?: boolean;
    [key: string]: any;
}

const LIST_COLUMNS = 'id, title, date, category, excerpt, description, featured_image, featured_image_alt, feature_image, focus_keyword, author, tags, cta_featured, meta_title, meta_robots, updated_at, access_code';

function mapRow(row: Record<string, unknown>): PostData {
    return {
        id: row.id as string,
        title: row.title as string,
        date: row.date as string,
        category: row.category as string,
        excerpt: row.excerpt as string | undefined,
        description: row.description as string | undefined,
        featuredImage: (row.featured_image || row.feature_image) as string | undefined,
        featuredImageAlt: row.featured_image_alt as string | undefined,
        featureImage: (row.feature_image || row.featured_image) as string | undefined,
        focusKeyword: row.focus_keyword as string | undefined,
        author: row.author as string | undefined,
        tags: row.tags as string[] | undefined,
        ctaFeatured: row.cta_featured as boolean | undefined,
        metaTitle: row.meta_title as string | undefined,
        metaRobots: row.meta_robots as string | undefined,
        updatedAt: row.updated_at as string | undefined,
        isGated: !!(row.access_code),
        isVip: !!(row.access_code) && !!(row.tags as string[])?.includes('vip'),
    };
}

export const getSortedPostsData = unstable_cache(
    async (): Promise<PostData[]> => {
        const { data, error } = await supabase
            .from('posts')
            .select(LIST_COLUMNS)
            .eq('is_published', true)
            .order('date', { ascending: false });

        if (error || !data) return [];
        return data.map(mapRow);
    },
    ['posts-list'],
    { revalidate: 60, tags: ['posts'] }
);

export const getLatestPosts = unstable_cache(
    async (limit = 6): Promise<PostData[]> => {
        const { data, error } = await supabase
            .from('posts')
            .select('id, title, date, category, excerpt, description, featured_image, feature_image, author, tags')
            .eq('is_published', true)
            .order('date', { ascending: false })
            .limit(limit);

        if (error || !data) return [];
        return data.map(mapRow);
    },
    ['latest-posts'],
    { revalidate: 60, tags: ['posts'] }
);

// unstable_cache는 dynamic arg를 지원하지 않으므로 category를 key에 포함하는 factory 사용
export function getPostsByTag(tag: string) {
    return unstable_cache(
        async (): Promise<PostData[]> => {
            const { data, error } = await supabase
                .from('posts')
                .select(LIST_COLUMNS)
                .eq('is_published', true)
                .contains('tags', [tag])
                .order('date', { ascending: false });

            if (error || !data) return [];
            return data.map(mapRow);
        },
        [`posts-by-tag-${tag}`],
        { revalidate: 60, tags: ['posts'] }
    )();
}

export function getPostsByCategory(category: string) {
    return unstable_cache(
        async (): Promise<PostData[]> => {
            const { data, error } = await supabase
                .from('posts')
                .select(LIST_COLUMNS)
                .eq('is_published', true)
                .ilike('category', `%${category}%`)
                .order('date', { ascending: false });

            if (error || !data) return [];
            return data.map(mapRow);
        },
        [`posts-by-category-${category}`],
        { revalidate: 60, tags: ['posts'] }
    )();
}

export async function getAllPostIds() {
    const { data, error } = await supabase
        .from('posts')
        .select('id')
        .eq('is_published', true);

    if (error || !data) return [];
    return data.map((row) => ({ params: { slug: row.id as string } }));
}

export async function getPostData(id: string): Promise<PostData> {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) throw new Error(`Post not found: ${id}`);

    // Gated posts: return metadata only, no content (content served via verify-code API)
    if (data.access_code) {
        return {
            ...mapRow(data),
            isGated: true,
        };
    }

    const rawContent = (data.content as string) || '';
    const isHtml = rawContent.trim().startsWith('<');
    const contentHtml = isHtml
        ? rawContent
        : (await remark().use(html, { allowDangerousHtml: true }).process(rawContent)).toString();

    return {
        ...mapRow(data),
        contentHtml,
    };
}

export async function postExists(slug: string): Promise<boolean> {
    const { count, error } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('id', slug);
    return !error && (count ?? 0) > 0;
}

export async function getRelatedPosts(currentId: string, category: string, limit: number = 3): Promise<PostData[]> {
    const { data, error } = await supabase
        .from('posts')
        .select('id, title, date, category, excerpt, description, featured_image, featured_image_alt, feature_image, focus_keyword, author, tags')
        .eq('is_published', true)
        .eq('category', category)
        .neq('id', currentId)
        .order('date', { ascending: false })
        .limit(limit);

    if (error || !data) return [];
    return data.map(mapRow);
}
