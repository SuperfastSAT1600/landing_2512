import { unstable_cache, revalidateTag } from 'next/cache';
import { supabase, supabaseAdmin } from './supabase';

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
