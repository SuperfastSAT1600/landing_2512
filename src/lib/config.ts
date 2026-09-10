import { unstable_cache, revalidateTag } from 'next/cache';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';

export interface StoredFeatureItem {
    postSlug: string;
    title: string;
    description: string;
}

export interface FeatureItem {
    title: string;
    description: string;
    link: string;
    image?: string;
}

export interface HomeConfig {
    hero: {
        ctaText: string;
        ctaLink: string;
    };
    features: StoredFeatureItem[];
    floatingCta: {
        discountLabel: string;
        discountPostSlug: string;
    };
}

const DEFAULT_CONFIG: HomeConfig = {
    hero: { ctaText: "25년 11월 시험 목표달성 학생 인터뷰", ctaLink: "/blog/sat-nov25-score-interview" },
    features: [
        { postSlug: "score-perfect-800", title: "Example Feature", description: "Description here" }
    ],
    floatingCta: { discountLabel: "할인 혜택 보기", discountPostSlug: "" }
};

export const getHomeConfig = unstable_cache(
    async (): Promise<HomeConfig> => {
        const { data, error } = await supabase
            .from('site_config')
            .select('config')
            .eq('id', 'home')
            .single();

        if (error || !data) return DEFAULT_CONFIG;
        return data.config as HomeConfig;
    },
    ['home-config'],
    { tags: ['home-config'] }
);

export async function saveHomeConfig(config: HomeConfig): Promise<void> {
    await supabaseAdmin
        .from('site_config')
        .upsert({ id: 'home', config });
    revalidateTag('home-config', 'default');
}

// ── SuperTest config ────────────────────────────────────────────────────────

export interface SupertestConfig {
    remainingSpots: number;
    nextTestDate: string;         // YYYY-MM-DD (hero D-day 기준)
    testTime: string;             // HH:MM KST — 포털 카운트다운용, 기본 '09:00'
    maxFreeSlots: number;         // 포털 무료 응시 최대 인원
    portalApplicantCount: number; // 현재 포털 신청자 수
}

const DEFAULT_SUPERTEST_CONFIG: SupertestConfig = {
    remainingSpots: 30,
    nextTestDate: '2026-05-30',
    testTime: '09:00',
    maxFreeSlots: 10,
    portalApplicantCount: 0,
};

export const getSupertestConfig = unstable_cache(
    async (): Promise<SupertestConfig> => {
        const { data, error } = await supabase
            .from('site_config')
            .select('config')
            .eq('id', 'supertest')
            .single();
        if (error || !data) return DEFAULT_SUPERTEST_CONFIG;
        return data.config as SupertestConfig;
    },
    ['supertest-config'],
    { tags: ['supertest-config'] }
);

export async function saveSupertestConfig(config: SupertestConfig): Promise<void> {
    await supabaseAdmin
        .from('site_config')
        .upsert({ id: 'supertest', config });
    revalidateTag('supertest-config', 'default');
}

// ── Portal Posts config ─────────────────────────────────────────────────────

export interface PortalPost {
    id: string;       // crypto.randomUUID()
    title: string;
    content: string;
    active: boolean;
    order: number;    // 표시 순서 (오름차순)
    created_at: string; // ISO timestamp
}

export async function getPortalPosts(): Promise<PortalPost[]> {
    const { data, error } = await supabaseAdmin
        .from('site_config')
        .select('config')
        .eq('id', 'portal-posts')
        .single();
    if (error || !data) return [];
    return (data.config as PortalPost[]) ?? [];
}

export async function savePortalPosts(posts: PortalPost[]): Promise<void> {
    await supabaseAdmin
        .from('site_config')
        .upsert({ id: 'portal-posts', config: posts });
}
