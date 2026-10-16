import { getPublishedReviews } from './reviews-data';
import { reviews as staticReviews } from './reviews';

// 조직 구조화 데이터. 평점은 기본적으로 포함하지 않는다.
//
// 이전에는 이 블록이 통째로 app/layout.tsx 에 있어서 모든 페이지에 복사됐고,
// ratingValue "4.9" / reviewCount "47" 이 상수로 박혀 있었다. 실제 공개 후기는
// 229건(평균 4.99)이라 숫자가 맞지도 않았고, 이차방정식 연습문제 페이지까지
// "평점 4.9 / 후기 47건" 이라고 선언하는 상태였다.
//
// 평점은 그 페이지의 주제에 대한 것이어야 하므로, 학원 자체를 설명하는
// 홈과 /reviews 에서만 includeRating 으로 붙인다.

const ORGANIZATION = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'SuperfastSAT',
    legalName: 'Argonaut AI Inc.',
    url: 'https://superfastsat.com',
    description:
        'SuperfastSAT은 Digital SAT 전문 온라인 학원으로, 목표 점수 달성까지 최단 경로로 안내합니다.',
    address: {
        '@type': 'PostalAddress',
        streetAddress: '302, 21 Samgae-ro',
        addressLocality: 'Mapo-gu, Seoul',
        addressCountry: 'KR',
    },
    telephone: '02-6956-0061',
    email: 'cs@argonautai.co.kr',
    sameAs: ['https://superfastsat.com', 'https://tutoring.superfastsat.com'],
};

/**
 * /reviews 가 실제로 노출하는 후기(하드코딩 + published JSON)로 평점을 집계한다.
 * 화면에 보이는 것과 구조화 데이터가 어긋나지 않도록 같은 출처를 쓴다.
 */
export function getAggregateRating() {
    const ratings = [
        ...staticReviews.map((r) => r.rating),
        ...getPublishedReviews().map((r) => r.rating),
    ].filter((r): r is number => typeof r === 'number' && r > 0);

    if (ratings.length === 0) return undefined;

    const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    return {
        '@type': 'AggregateRating',
        ratingValue: average.toFixed(2),
        reviewCount: String(ratings.length),
        bestRating: '5',
        worstRating: '1',
    };
}

export function buildOrganizationSchema({ includeRating = false } = {}) {
    if (!includeRating) return ORGANIZATION;
    const aggregateRating = getAggregateRating();
    return aggregateRating ? { ...ORGANIZATION, aggregateRating } : ORGANIZATION;
}
