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
    featureImage?: string;
    description?: string;
    author?: string;
    tags?: string[];
    contentHtml?: string;
    ctaFeatured?: boolean;
    [key: string]: any;
}

function mapRow(row: Record<string, unknown>): PostData {
    return {
        id: row.id as string,
        title: row.title as string,
        date: row.date as string,
        category: row.category as string,
        excerpt: row.excerpt as string | undefined,
        description: row.description as string | undefined,
        featuredImage: row.featured_image as string | undefined,
        featureImage: row.feature_image as string | undefined,
        author: row.author as string | undefined,
        tags: row.tags as string[] | undefined,
        ctaFeatured: row.cta_featured as boolean | undefined,
    };
}

export async function getSortedPostsData(): Promise<PostData[]> {
    const { data, error } = await supabase
        .from('posts')
        .select('id, title, date, category, excerpt, description, featured_image, feature_image, author, tags, cta_featured')
        .order('date', { ascending: false });

    if (error || !data) return [];
    return data.map(mapRow);
}

export async function getAllPostIds() {
    const { data, error } = await supabase
        .from('posts')
        .select('id');

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

    const processedContent = await remark()
        .use(html, { allowDangerousHtml: true })
        .process((data.content as string) || '');
    const contentHtml = processedContent.toString();

    return {
        ...mapRow(data),
        contentHtml,
    };
}

export async function getRelatedPosts(currentId: string, category: string, limit: number = 3): Promise<PostData[]> {
    const { data, error } = await supabase
        .from('posts')
        .select('id, title, date, category, excerpt, description, featured_image, feature_image, author, tags')
        .eq('category', category)
        .neq('id', currentId)
        .order('date', { ascending: false })
        .limit(limit);

    if (error || !data) return [];
    return data.map(mapRow);
}
