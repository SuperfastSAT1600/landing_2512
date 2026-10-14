import { NextRequest, NextResponse } from 'next/server';
import { isAiBot } from '@/lib/ai-bots';
import { retiredEnrollmentTarget } from '@/lib/retired-enrollment';

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

    // 종료된 수업권 V1·V2 — 고객은 블로그로(쿼리 유지), 관리자는 예전 페이지 확인 가능
    const retiredTarget = retiredEnrollmentTarget(request.nextUrl.pathname);
    if (retiredTarget && request.cookies.get('admin_verified')?.value !== '1') {
        const url = request.nextUrl.clone();
        url.pathname = retiredTarget;
        return NextResponse.redirect(url, 307);
    }

    return NextResponse.next();
}

export const config = {
    // Apply to all routes except static assets and Next.js internals
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
