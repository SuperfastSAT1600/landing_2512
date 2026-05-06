import { describe, it, expect, vi } from 'vitest';
import { getSortedPostsData } from '../posts';

// Mock Supabase client
vi.mock('../supabase', () => ({
    supabase: {
        from: () => ({
            select: () => ({
                order: () => Promise.resolve({
                    data: [
                        {
                            id: 'test-post',
                            title: 'Test Post',
                            date: '2024-01-01',
                            category: 'SAT RW',
                            excerpt: 'A test post',
                            description: null,
                            featured_image: null,
                            feature_image: null,
                            author: 'Test',
                            tags: [],
                            cta_featured: false,
                        }
                    ],
                    error: null,
                }),
            }),
        }),
    },
    supabaseAdmin: {},
}));

describe('getSortedPostsData', () => {
    it('returns mapped posts from Supabase', async () => {
        const posts = await getSortedPostsData();
        expect(posts).toHaveLength(1);
        expect(posts[0].id).toBe('test-post');
        expect(posts[0].title).toBe('Test Post');
        expect(posts[0].category).toBe('SAT RW');
    });
});
