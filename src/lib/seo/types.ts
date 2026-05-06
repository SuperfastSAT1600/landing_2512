export interface SeoCheckResult {
    id: string;
    label: string;
    status: 'good' | 'warning' | 'error';
    message: string;
    priority: 1 | 2 | 3;
}

export interface SeoAnalysisResult {
    score: number; // 0-100
    checks: SeoCheckResult[];
}

export interface SeoInputData {
    title: string;
    slug: string;
    metaTitle?: string;
    description: string;
    excerpt: string;
    focusKeyword: string;
    contentHtml: string;
    featuredImage: string;
    featuredImageAlt: string;
    tags: string;
}
