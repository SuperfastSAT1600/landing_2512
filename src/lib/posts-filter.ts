import type { PostData } from './posts';

// '학습코치' category = coach profile intro posts (linked via admin) — hidden from article listing.
// Regular SAT blog posts by a coach use SAT RW / SAT Math / 입시뉴스 categories and remain visible.
export const HIDDEN_BLOG_CATEGORIES = ['학습코치'] as const;

type HiddenCategory = typeof HIDDEN_BLOG_CATEGORIES[number];

export function excludeHiddenCategories(posts: PostData[]): PostData[] {
    return posts.filter(
        p => !HIDDEN_BLOG_CATEGORIES.includes((p.category ?? '').trim() as HiddenCategory)
    );
}
