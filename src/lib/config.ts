import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'src/data/home-config.json');

// 저장 포맷 (home-config.json에 보존)
export interface StoredFeatureItem {
    postSlug: string;    // 참조할 블로그 포스트 slug
    title: string;
    description: string;
}

// 표시 포맷 (Features.tsx가 받는 props)
export interface FeatureItem {
    title: string;
    description: string;
    link: string;         // enrichment 후 /blog/{postSlug}
    image?: string;       // enrichment 후 포스트 이미지
}

export interface HomeConfig {
    hero: {
        ctaText: string;
        ctaLink: string;
    };
    features: StoredFeatureItem[];
    floatingCta: {
        discountLabel: string;   // 버튼에 표시될 텍스트
        discountPostSlug: string; // 클릭 시 이동할 포스트 slug
    };
}

export function getHomeConfig(): HomeConfig {
    if (!fs.existsSync(configPath)) {
        // Return defaults if missing
        return {
            hero: { ctaText: "25년 11월 시험 목표달성 학생 인터뷰", ctaLink: "/blog/sat-nov25-score-interview" },
            features: [
                { postSlug: "score-perfect-800", title: "Example Feature", description: "Description here" }
            ],
            floatingCta: { discountLabel: "할인 혜택 보기", discountPostSlug: "" }
        };
    }
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
}

export function saveHomeConfig(config: HomeConfig) {
    // Ensure dir exists
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
}
