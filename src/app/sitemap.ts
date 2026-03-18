import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getSortedPostsData } from '../lib/posts';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const headersList = await headers();
    const host = headersList.get('host') || 'www.superfastsat.com';
    const baseUrl = `https://${host}`;

    if (host.startsWith('tutoring.')) {
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
        ];
    }

    const posts = await getSortedPostsData();

    // Filter out noindex posts from sitemap
    const indexablePosts = posts.filter((post) => {
        if (!post.metaRobots) return true;
        return !post.metaRobots.includes('noindex');
    });

    const blogPosts = indexablePosts.map((post) => ({
        url: `${baseUrl}/blog/${post.id}`,
        lastModified: new Date(post.updatedAt || post.date),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 1,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        ...blogPosts,
    ];
}
