'use client';

import { useEffect, useState } from 'react';
import styles from '../reviews/reviews.module.css';
import { Star } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';
import { ReviewData } from '@/lib/reviews-data';

interface ReviewsListProps {
    initialReviews: ReviewData[];
}

export default function ReviewsList({ initialReviews }: ReviewsListProps) {
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    useEffect(() => {
        const handleHash = () => {
            const hash = window.location.hash;
            if (hash) {
                const id = hash.replace('#review-', '');
                setHighlightedId(id);
                setTimeout(() => setHighlightedId(null), 3000);
            }
        };

        handleHash();
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    return (
        <div className={styles.grid}>
            {initialReviews.map((review) => {
                const isHighlighted = review.id === highlightedId;
                return (
                    <ScrollReveal key={review.id}>
                        <div
                            id={`review-${review.id}`}
                            className={`${styles.card} ${isHighlighted ? styles.highlighted : ''}`}
                            style={{ scrollMarginTop: '150px' }}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.stars}>
                                    {[...Array(review.rating)].map((_, i) => (
                                        <Star key={i} size={16} fill="#3B82F6" color="#3B82F6" />
                                    ))}
                                </div>
                                <span className={styles.categoryBadge}>{review.category}</span>
                            </div>

                            <h3 className={styles.reviewTitle}>{review.title}</h3>
                            <p className={styles.fullContent}>"{review.content}"</p>

                            <div className={styles.divider} />

                            <div className={styles.authorArea}>
                                <div className={styles.info}>
                                    <div className={styles.nameRow}>
                                        <span className={styles.name}>{review.author}</span>
                                        <span className={styles.authorType}>
                                            {review.authorType === 'Student' ? '수강생' : '학부모'}
                                        </span>
                                    </div>
                                    <p className={styles.metaInfo}>
                                        {review.grade} <span className={styles.dateDivider}>•</span> {review.date}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                );
            })}
        </div>
    );
}
