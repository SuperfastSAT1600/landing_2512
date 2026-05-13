import type { PostData } from './posts';

export const HIDDEN_BLOG_CATEGORIES = ['학습코치'] as const;

type HiddenCategory = typeof HIDDEN_BLOG_CATEGORIES[number];

export function excludeHiddenCategories(posts: PostData[]): PostData[] {
    return posts.filter(
        p => !HIDDEN_BLOG_CATEGORIES.includes((p.category ?? '').trim() as HiddenCategory)
    );
}
