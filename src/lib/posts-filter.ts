import type { PostData } from './posts';

// Posts tagged with '코치 소개' are linked to coach profile pages in admin and must not appear in the article listing.
// Regular blog posts authored by a coach (without this tag) remain visible in articles.
export const HIDDEN_BLOG_TAGS = ['코치 소개'] as const;

type HiddenTag = typeof HIDDEN_BLOG_TAGS[number];

export function excludeHiddenCategories(posts: PostData[]): PostData[] {
    return posts.filter(p =>
        !(p.tags ?? []).some(t => HIDDEN_BLOG_TAGS.includes(t.trim() as HiddenTag))
    );
}
