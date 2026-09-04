import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { AI_BOT_PATTERNS } from '@/lib/ai-bots';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const headersList = await headers();
    const host = headersList.get('host') || 'www.superfastsat.com';
    const baseUrl = `https://${host}`;

    const aiBotRules: MetadataRoute.Robots['rules'] = AI_BOT_PATTERNS.map((bot) => ({
        userAgent: bot,
        disallow: '/',
    }));

    return {
        rules: [
            // Block all AI training and LLM data collection bots
            ...aiBotRules,
            // Default rule for all other crawlers
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/private/', '/admin/', '/api/'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
