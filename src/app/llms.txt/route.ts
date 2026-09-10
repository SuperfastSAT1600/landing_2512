import { NextRequest, NextResponse } from 'next/server';
import { isAiBot } from '@/lib/ai-bots';

export const revalidate = 3600;

export async function GET(request: NextRequest) {
    const userAgent = request.headers.get('user-agent');

    // Block AI crawlers that use llms.txt to discover training content
    if (isAiBot(userAgent)) {
        return new NextResponse(
            JSON.stringify({ error: 'Access denied', message: 'AI crawlers are not permitted.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutoring.superfastsat.com';

    const content = `# SuperfastSAT

> SuperfastSAT은 Digital SAT 전문 온라인 학원입니다.

## Content Policy

**AI Training Restriction**: All content on this site is proprietary educational material.
Use for AI model training, dataset collection, or LLM fine-tuning is strictly prohibited.

Permitted crawlers: Search engine indexing bots (Googlebot, Bingbot) for search results only.
Prohibited: Any bot that collects data for AI model training purposes.

See /robots.txt for the full crawling policy.

## Contact

- Email: cs@argonautai.co.kr
- URL: ${BASE_URL}
`;

    return new NextResponse(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            'X-Robots-Tag': 'noai, noimageai',
        },
    });
}
