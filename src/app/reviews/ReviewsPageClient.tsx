'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import styles from './reviews.module.css';
import { ScrollReveal } from '../components/ScrollReveal';
import type { ReviewData } from '@/lib/reviews-data';

export default function ReviewsPageClient({ reviews }: { reviews: ReviewData[] }) {
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    useEffect(() => {
        let timerId: ReturnType<typeof setTimeout> | null = null;

        const handleHash = () => {
            const hash = window.location.hash;
            if (hash) {
                const id = hash.replace('#review-', '');
                setHighlightedId(id);
                if (timerId) clearTimeout(timerId);
                timerId = setTimeout(() => setHighlightedId(null), 3000);
            }
        };
        handleHash();
        window.addEventListener('hashchange', handleHash);
        return () => {
            window.removeEventListener('hashchange', handleHash);
            if (timerId) clearTimeout(timerId);
        };
    }, []);

    return (
        <div className={styles.grid}>
            {reviews.map((review) => {
                const isHighlighted = review.id === highlightedId;
                return (
                    <ScrollReveal key={review.id}>
                        <div
                            id={`review-${review.id}`}
                            className={`${styles.card} ${isHighlighted ? styles.highlighted : ''}`}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.headerTop}>
                                    <span className={styles.categoryBadge}>{review.category}</span>
                                    <ArrowUpRight className={styles.actionIcon} size={24} />
                                </div>
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
                                        {review.grade}<span className={styles.dateDivider}>•</span>{review.date}
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
