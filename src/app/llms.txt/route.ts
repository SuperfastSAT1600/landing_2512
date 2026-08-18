import { NextResponse } from 'next/server';
import { getSortedPostsData } from '@/lib/posts';

export const revalidate = 3600; // revalidate every hour

export async function GET() {
    const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tutoring.superfastsat.com';
    const posts = await getSortedPostsData();

    const indexablePosts = posts.filter((post) => {
        if (!post.metaRobots) return true;
        return !post.metaRobots.includes('noindex');
    });

    const postLines = indexablePosts
        .slice(0, 50) // limit to 50 most recent
        .map((post) => `- [${post.title}](${BASE_URL}/blog/${post.id})`)
        .join('\n');

    const content = `# SuperfastSAT

> SuperfastSAT은 Digital SAT 전문 온라인 학원입니다. AI 기반 진단 테스트와 맞춤형 커리큘럼으로 목표 점수 달성을 최단 경로로 안내합니다.

## About

- **Service**: Digital SAT 온라인 학원 (Reading & Writing, Math)
- **Language**: Korean (한국어), English
- **Audience**: 한국 학생 및 미국 유학 준비생
- **Provider**: Argonaut AI Inc. (cs@argonautai.co.kr)
- **URL**: ${BASE_URL}

## Key Pages

- [홈 - SAT 목표 점수 달성](${BASE_URL}/)
- [블로그 - 입시 자료 & 학습 칼럼](${BASE_URL}/blog)
- [SAT 진단 테스트](${BASE_URL}/diagnosis)

## Blog Posts

${postLines}

## Content Policy

All content is original educational material created by SuperfastSAT instructors.
Content is in Korean and covers Digital SAT preparation strategies, grammar, reading comprehension, and math.

## Contact

- Email: cs@argonautai.co.kr
- Phone: 02-6956-0061
`;

    return new NextResponse(content, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
}
