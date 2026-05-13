import { getPublishedReviews, ReviewData } from '@/lib/reviews-data';
import { reviews as hardcodedReviews } from '@/lib/reviews';
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

export default function ReviewsPage() {
    const jsonReviews = getPublishedReviews();
    const staticReviews = hardcodedReviews.map(toReviewData);
    const allReviews = [...staticReviews, ...jsonReviews];

    return (
        <main className={styles.container}>
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
