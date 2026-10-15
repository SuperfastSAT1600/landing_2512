import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getSortedPostsData } from '../lib/posts';
import { excludeHiddenCategories } from '../lib/posts-filter';
import { getActiveCoaches } from '../lib/coaches-data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const headersList = await headers();
    const host = headersList.get('host') || 'www.superfastsat.com';
    const baseUrl = `https://${host}`;

    if (host.startsWith('tutoring.')) {
        const [posts, coaches] = await Promise.all([getSortedPostsData(), getActiveCoaches()]);

        // 학습코치 글은 목록에서 가려져 있고 /coaches/[slug] 로 영구 리다이렉트된다.
        // 사이트맵에 남겨두면 Google이 크롤만 하고 색인하지 않아 크롤 예산만 쓴다.
        const indexablePosts = excludeHiddenCategories(posts).filter((post) => {
            if (!post.metaRobots) return true;
            return !post.metaRobots.includes('noindex');
        });

        const blogPosts = indexablePosts.map((post) => ({
            // 한글 슬러그를 인코딩하지 않으면 사이트맵 규격 위반이고, Googlebot이 적힌 그대로
            // 요청했을 때 500이 떨어진다. (퍼센트 인코딩된 같은 URL은 200)
            url: `${baseUrl}/blog/${encodeURIComponent(post.id)}`,
            lastModified: new Date(post.updatedAt || post.date),
            changeFrequency: 'monthly' as const,
            priority: 0.7,
        }));

        const coachPages = coaches.map((coach) => ({
            url: `${baseUrl}/coaches/${encodeURIComponent(coach.slug)}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        }));

        return [
            {
                url: baseUrl,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 1,
            },
            {
                url: `${baseUrl}/diagnosis`,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.9,
            },
            {
                url: `${baseUrl}/blog`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.8,
            },
            {
                url: `${baseUrl}/coaches`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.8,
            },
            {
                url: `${baseUrl}/supertest`,
                lastModified: new Date(),
                changeFrequency: 'monthly',
                priority: 0.7,
            },
            {
                url: `${baseUrl}/reviews`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.7,
            },
            ...blogPosts,
            ...coachPages,
        ];
    }

    // www.superfastsat.com — landing page only
    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 1,
        },
    ];
}
