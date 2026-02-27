import { SeoInputData, SeoAnalysisResult, SeoCheckResult } from './types';

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(text: string): number {
    const cleaned = text.trim();
    if (!cleaned) return 0;
    // Count Korean characters as words + split English by spaces
    const koreanChars = (cleaned.match(/[\uAC00-\uD7AF]/g) || []).length;
    const englishWords = cleaned
        .replace(/[\uAC00-\uD7AF]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0).length;
    return koreanChars + englishWords;
}

function getKeywordDensity(text: string, keyword: string): number {
    if (!keyword || !text) return 0;
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const matches = lowerText.split(lowerKeyword).length - 1;
    const words = countWords(text);
    if (words === 0) return 0;
    const keywordWords = countWords(keyword);
    return (matches * keywordWords / words) * 100;
}

function extractHeadings(html: string): Array<{ level: number; text: string }> {
    const headings: Array<{ level: number; text: string }> = [];
    const regex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        headings.push({
            level: parseInt(match[1]),
            text: stripHtml(match[2]),
        });
    }
    return headings;
}

function findImagesWithoutAlt(html: string): number {
    const imgRegex = /<img[^>]*>/gi;
    let count = 0;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        const tag = match[0];
        const altMatch = tag.match(/alt=["']([^"']*)["']/);
        if (!altMatch || altMatch[1].trim() === '') {
            count++;
        }
    }
    return count;
}

function hasInternalLinks(html: string): boolean {
    const linkRegex = /<a[^>]+href=["']([^"']*)["']/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        if (href.startsWith('/') || href.includes('satmasterclass.com') || href.includes('superfastsat.com')) {
            return true;
        }
    }
    return false;
}

export function analyzeSeo(input: SeoInputData): SeoAnalysisResult {
    const checks: SeoCheckResult[] = [];
    const plainText = stripHtml(input.contentHtml);
    const headings = extractHeadings(input.contentHtml);
    const effectiveTitle = input.metaTitle || `${input.title} | SuperfastSAT Blog`;

    // P1 checks (12 points each) — 6 checks = 72 points
    // 1. Focus keyword in title
    if (input.focusKeyword) {
        const inTitle = input.title.toLowerCase().includes(input.focusKeyword.toLowerCase());
        checks.push({
            id: 'keyword-in-title',
            label: '제목에 키워드 포함',
            status: inTitle ? 'good' : 'error',
            message: inTitle
                ? `타겟 키워드 "${input.focusKeyword}"가 제목에 포함되어 있습니다.`
                : `타겟 키워드 "${input.focusKeyword}"를 제목에 포함하세요.`,
            priority: 1,
        });
    } else {
        checks.push({
            id: 'keyword-in-title',
            label: '제목에 키워드 포함',
            status: 'error',
            message: '타겟 키워드를 설정해주세요.',
            priority: 1,
        });
    }

    // 2. Focus keyword in slug
    if (input.focusKeyword && input.slug) {
        const keywordSlug = input.focusKeyword.toLowerCase().replace(/\s+/g, '-');
        const inSlug = input.slug.toLowerCase().includes(keywordSlug) ||
            input.focusKeyword.toLowerCase().split(/\s+/).some(w => input.slug.toLowerCase().includes(w));
        checks.push({
            id: 'keyword-in-slug',
            label: 'URL에 키워드 포함',
            status: inSlug ? 'good' : 'warning',
            message: inSlug
                ? 'URL에 키워드가 반영되어 있습니다.'
                : 'URL에 키워드를 포함하면 SEO에 도움이 됩니다.',
            priority: 1,
        });
    } else {
        checks.push({
            id: 'keyword-in-slug',
            label: 'URL에 키워드 포함',
            status: 'warning',
            message: input.slug ? '타겟 키워드를 설정하면 URL 평가가 가능합니다.' : 'URL slug를 입력해주세요.',
            priority: 1,
        });
    }

    // 3. Focus keyword in description
    if (input.focusKeyword && input.description) {
        const inDesc = input.description.toLowerCase().includes(input.focusKeyword.toLowerCase());
        checks.push({
            id: 'keyword-in-description',
            label: 'Meta Description에 키워드 포함',
            status: inDesc ? 'good' : 'warning',
            message: inDesc
                ? 'Meta description에 타겟 키워드가 포함되어 있습니다.'
                : 'Meta description에 타겟 키워드를 포함하세요.',
            priority: 1,
        });
    } else {
        checks.push({
            id: 'keyword-in-description',
            label: 'Meta Description에 키워드 포함',
            status: 'warning',
            message: !input.description ? 'Meta description을 입력해주세요.' : '타겟 키워드를 설정해주세요.',
            priority: 1,
        });
    }

    // 4. Keyword density (0.5-2.5%)
    if (input.focusKeyword && plainText) {
        const density = getKeywordDensity(plainText, input.focusKeyword);
        const isGood = density >= 0.5 && density <= 2.5;
        const isLow = density < 0.5;
        checks.push({
            id: 'keyword-density',
            label: '키워드 밀도',
            status: isGood ? 'good' : 'warning',
            message: isGood
                ? `키워드 밀도 ${density.toFixed(1)}% (적정 범위: 0.5-2.5%)`
                : isLow
                    ? `키워드 밀도 ${density.toFixed(1)}%로 낮습니다. 본문에 키워드를 더 사용하세요.`
                    : `키워드 밀도 ${density.toFixed(1)}%로 높습니다. 과도한 키워드 사용을 줄이세요.`,
            priority: 1,
        });
    } else {
        checks.push({
            id: 'keyword-density',
            label: '키워드 밀도',
            status: 'warning',
            message: '키워드와 본문 콘텐츠가 필요합니다.',
            priority: 1,
        });
    }

    // 5. Meta title length (30-60 chars)
    const titleLen = effectiveTitle.length;
    checks.push({
        id: 'meta-title-length',
        label: 'Meta Title 길이',
        status: titleLen >= 30 && titleLen <= 60 ? 'good' : titleLen > 0 && titleLen < 30 ? 'warning' : titleLen > 60 ? 'warning' : 'error',
        message: titleLen >= 30 && titleLen <= 60
            ? `Meta title ${titleLen}자 (적정 범위: 30-60자)`
            : titleLen > 60
                ? `Meta title ${titleLen}자로 깁니다. 60자 이내로 줄이세요.`
                : titleLen > 0
                    ? `Meta title ${titleLen}자로 짧습니다. 30자 이상으로 늘리세요.`
                    : 'Meta title을 입력해주세요.',
        priority: 1,
    });

    // 6. Meta description length (120-160 chars)
    const descLen = input.description.length;
    checks.push({
        id: 'meta-description-length',
        label: 'Meta Description 길이',
        status: descLen >= 120 && descLen <= 160 ? 'good' : descLen > 0 && descLen < 120 ? 'warning' : descLen > 160 ? 'warning' : 'error',
        message: descLen >= 120 && descLen <= 160
            ? `Meta description ${descLen}자 (적정 범위: 120-160자)`
            : descLen > 160
                ? `Meta description ${descLen}자로 깁니다. 160자 이내로 줄이세요.`
                : descLen > 0
                    ? `Meta description ${descLen}자로 짧습니다. 120자 이상으로 작성하세요.`
                    : 'Meta description을 입력해주세요.',
        priority: 1,
    });

    // P2 checks (8 points each) — 5 checks = 40 points
    // 7. Content length (300+ words)
    const wordCount = countWords(plainText);
    checks.push({
        id: 'content-length',
        label: '콘텐츠 길이',
        status: wordCount >= 300 ? 'good' : wordCount >= 100 ? 'warning' : 'error',
        message: wordCount >= 300
            ? `${wordCount}단어 — 충분한 길이입니다.`
            : wordCount >= 100
                ? `${wordCount}단어 — 300단어 이상을 권장합니다.`
                : `${wordCount}단어 — 콘텐츠가 너무 짧습니다.`,
        priority: 2,
    });

    // 8. No H1 in body (article H1 should be the title only)
    const bodyH1s = headings.filter(h => h.level === 1);
    checks.push({
        id: 'no-h1-in-body',
        label: 'H1 태그 사용',
        status: bodyH1s.length === 0 ? 'good' : 'warning',
        message: bodyH1s.length === 0
            ? '본문에 H1 태그가 없습니다. (제목이 H1 역할)'
            : `본문에 H1 태그 ${bodyH1s.length}개 발견. 페이지당 H1은 하나만 권장됩니다.`,
        priority: 2,
    });

    // 9. At least one H2
    const h2Count = headings.filter(h => h.level === 2).length;
    checks.push({
        id: 'has-h2',
        label: 'H2 소제목 사용',
        status: h2Count >= 1 ? 'good' : 'warning',
        message: h2Count >= 1
            ? `H2 소제목 ${h2Count}개 사용 중.`
            : '본문에 H2 소제목을 추가하세요. 콘텐츠 구조화에 도움이 됩니다.',
        priority: 2,
    });

    // 10. Heading hierarchy skip (H2 없이 H3)
    const headingLevels = headings.map(h => h.level);
    let hierarchyOk = true;
    for (let i = 0; i < headingLevels.length; i++) {
        if (headingLevels[i] === 3 && !headingLevels.slice(0, i).includes(2)) {
            hierarchyOk = false;
            break;
        }
        if (headingLevels[i] === 4 && !headingLevels.slice(0, i).includes(3)) {
            hierarchyOk = false;
            break;
        }
    }
    checks.push({
        id: 'heading-hierarchy',
        label: 'Heading 계층 구조',
        status: hierarchyOk ? 'good' : 'warning',
        message: hierarchyOk
            ? 'Heading 계층 구조가 올바릅니다.'
            : 'Heading 계층을 건너뛰었습니다 (예: H2 없이 H3 사용). 순서대로 사용하세요.',
        priority: 2,
    });

    // 11. Featured image exists
    checks.push({
        id: 'featured-image',
        label: '대표 이미지',
        status: input.featuredImage ? 'good' : 'error',
        message: input.featuredImage
            ? '대표 이미지가 설정되어 있습니다.'
            : '대표 이미지를 추가하세요. SNS 공유 시 클릭률이 높아집니다.',
        priority: 2,
    });

    // P3 checks (4 points each) — 3 checks = 12 points
    // 12. Featured image alt text
    checks.push({
        id: 'featured-image-alt',
        label: '대표 이미지 Alt 텍스트',
        status: !input.featuredImage ? 'good' : input.featuredImageAlt ? 'good' : 'warning',
        message: !input.featuredImage
            ? '대표 이미지가 없어 해당 없음.'
            : input.featuredImageAlt
                ? '대표 이미지 alt 텍스트가 설정되어 있습니다.'
                : '대표 이미지의 alt 텍스트를 입력하세요.',
        priority: 3,
    });

    // 13. Body images without alt
    const missingAlts = findImagesWithoutAlt(input.contentHtml);
    checks.push({
        id: 'body-image-alt',
        label: '본문 이미지 Alt 텍스트',
        status: missingAlts === 0 ? 'good' : 'warning',
        message: missingAlts === 0
            ? '모든 본문 이미지에 alt 텍스트가 있습니다.'
            : `본문 이미지 ${missingAlts}개에 alt 텍스트가 누락되었습니다.`,
        priority: 3,
    });

    // 14. Internal links
    const hasInternal = hasInternalLinks(input.contentHtml);
    checks.push({
        id: 'internal-links',
        label: '내부 링크',
        status: hasInternal ? 'good' : 'warning',
        message: hasInternal
            ? '본문에 내부 링크가 포함되어 있습니다.'
            : '다른 글이나 페이지로의 내부 링크를 추가하세요.',
        priority: 3,
    });

    // Calculate score: P1(12pt) x 6 + P2(8pt) x 5 + P3(4pt) x 3 = 112 max
    const MAX_SCORE = 112;
    const pointMap = { 1: 12, 2: 8, 3: 4 };
    let rawScore = 0;
    for (const check of checks) {
        const pts = pointMap[check.priority];
        if (check.status === 'good') rawScore += pts;
        else if (check.status === 'warning') rawScore += pts * 0.5;
        // error = 0 points
    }
    const score = Math.round((rawScore / MAX_SCORE) * 100);

    return { score: Math.min(100, Math.max(0, score)), checks };
}

export function extractHeadingTree(html: string): Array<{ level: number; text: string }> {
    return extractHeadings(html);
}
