import type { Metadata } from 'next';
import { getPublishedReviews, ReviewData } from '@/lib/reviews-data';
import { reviews as hardcodedReviews } from '@/lib/reviews';
import { buildOrganizationSchema } from '@/lib/organization-schema';
import ReviewsPageClient from './ReviewsPageClient';
import styles from './reviews.module.css';

function toReviewData(r: typeof hardcodedReviews[0]): ReviewData {
    return {
        id: r.id,
        title: r.title,
        content: r.content,
        author: r.author,
        authorType: r.authorType,
        grade: r.grade,
        category: r.category,
        rating: r.rating,
        isFeatured: r.isFeatured,
        date: r.date,
        marketingConsent: false,
        rewardType: '',
        contact: '',
        status: 'published',
    };
}

const staticReviews: ReviewData[] = hardcodedReviews.map(toReviewData);

// 후기 229건이 쌓여 있는데도 제목·설명이 없어 루트 레이아웃 기본값("SAT 목표 점수에
// 가장 빠르게")으로 색인돼 있었다. "SAT 학원 후기" 같은 전환 키워드를 잡을 페이지다.
export async function generateMetadata(): Promise<Metadata> {
    const count = staticReviews.length + getPublishedReviews().length;
    const title = `수강생 후기 ${count}건 — SAT 점수 상승 사례 | SuperfastSAT`;
    const description =
        `SuperfastSAT 수강생이 직접 남긴 후기 ${count}건. 어떤 점수대에서 시작해 ` +
        '어떻게 올랐는지, 코치별 수업 방식은 어땠는지 실제 사례로 확인하세요.';

    return {
        title,
        description,
        alternates: { canonical: 'https://tutoring.superfastsat.com/reviews' },
        openGraph: {
            type: 'website',
            url: 'https://tutoring.superfastsat.com/reviews',
            siteName: 'SuperfastSAT',
            title,
            description,
        },
        twitter: { card: 'summary_large_image', title, description },
    };
}

export default function ReviewsPage() {
    const jsonReviews = getPublishedReviews();
    const allReviews = [...staticReviews, ...jsonReviews];

    return (
        <main className={styles.container}>
            {/* 이 페이지가 보여주는 후기 그대로 집계한 평점이다. */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(buildOrganizationSchema({ includeRating: true })),
                }}
            />
            <div className={styles.header}>
                <h1 className={styles.title}>수강생들의 생생한 후기</h1>
                <p className={styles.subtitle}>
                    SuperfastSAT와 함께 목표를 달성한<br />
                    모든 학생들의 이야기를 확인해보세요.
                </p>
            </div>
            <ReviewsPageClient reviews={allReviews} />
        </main>
    );
}
