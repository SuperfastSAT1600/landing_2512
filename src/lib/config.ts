import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'src/data/home-config.json');

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
    features: FeatureItem[];
}

export function getHomeConfig(): HomeConfig {
    if (!fs.existsSync(configPath)) {
        // Return defaults if missing
        return {
            hero: { ctaText: "25년 11월 시험 목표달성 학생 인터뷰", ctaLink: "/blog" },
            features: [
                { title: "Example Feature", description: "Description here", link: "#" }
            ]
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
