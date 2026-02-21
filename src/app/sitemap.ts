import { MetadataRoute } from 'next';
import { getSortedPostsData } from '../lib/posts';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const posts = await getSortedPostsData();
    const baseUrl = 'https://www.satmasterclass.com';

    const blogPosts = posts.map((post) => ({
        url: `${baseUrl}/blog/${post.id}`,
        lastModified: new Date(post.date),
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
