import { NextRequest, NextResponse } from 'next/server';
import { isAiBot } from '@/lib/ai-bots';

export function middleware(request: NextRequest) {
    const userAgent = request.headers.get('user-agent');

    if (isAiBot(userAgent)) {
        return new NextResponse(
            JSON.stringify({
                error: 'Access denied',
                message:
                    'Automated AI training crawlers are not permitted to access this site. ' +
                    'See /robots.txt for crawling policy.',
            }),
            {
                status: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Robots-Tag': 'noindex, nofollow, noai, noimageai',
                },
            }
        );
    }

    return NextResponse.next();
}

export const config = {
    // Apply to all routes except static assets and Next.js internals
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
