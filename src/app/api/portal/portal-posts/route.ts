import { NextRequest, NextResponse } from 'next/server';
import { getPortalPosts, getPortalPostExclusions } from '@/lib/config';

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token') ?? '';

    const [posts, exclusions] = await Promise.all([
        getPortalPosts(),
        token ? getPortalPostExclusions() : Promise.resolve({} as Record<string, string[]>),
    ]);

    const excluded = new Set(token ? (exclusions[token] ?? []) : []);

    const active = posts
        .filter(p => {
            if (!p.active) return false;
            // 툴 카드(toolId 있음)는 학생별 숨기기 대상에서 제외 — 항상 표시
            if (p.toolId) return true;
            return !excluded.has(p.id);
        })
        .sort((a, b) => a.order - b.order);

    return NextResponse.json(active);
}
