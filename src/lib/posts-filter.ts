import type { PostData } from './posts';

export const HIDDEN_BLOG_CATEGORIES = ['학습코치'] as const;
export const HIDDEN_BLOG_TAGS = ['코치 소개'] as const;

type HiddenCategory = typeof HIDDEN_BLOG_CATEGORIES[number];
type HiddenTag = typeof HIDDEN_BLOG_TAGS[number];

export function excludeHiddenCategories(posts: PostData[]): PostData[] {
    return posts.filter(p => {
        const hasHiddenCategory = HIDDEN_BLOG_CATEGORIES.includes((p.category ?? '').trim() as HiddenCategory);
        const hasHiddenTag = (p.tags ?? []).some(t => HIDDEN_BLOG_TAGS.includes(t.trim() as HiddenTag));
        return !hasHiddenCategory && !hasHiddenTag;
    });
}
