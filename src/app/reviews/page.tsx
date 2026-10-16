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
