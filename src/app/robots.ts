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
                // /api/og 는 블로그 글의 og:image 와 BlogPosting.image 가 쓰는
                // 썸네일 생성 엔드포인트다. /api 를 통째로 막으면 이미지도 못 가져간다.
                allow: ['/', '/api/og'],
                // '/admin/' 는 하위 경로만 막는다. 슬래시 없는 '/admin' 자체는
                // 매칭되지 않아 열려 있었다(200 응답 확인). 두 형태를 모두 막는다.
                disallow: ['/private', '/admin', '/api'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
