'use client';

import { useEffect, useState } from 'react';
import { reviews } from '../../lib/reviews';
import styles from './reviews.module.css';
import { Star, Quote, ArrowUpRight } from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';

export default function ReviewsPage() {
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    useEffect(() => {
        const handleHash = () => {
            const hash = window.location.hash;
            if (hash) {
                const id = hash.replace('#review-', '');
                setHighlightedId(id);
                // Optional: Scroll into view manually if needed, but ID usually handles it.
                // Reset highlight after 3 seconds
                setTimeout(() => setHighlightedId(null), 3000);
            }
        };

        // Run on mount
        handleHash();

        // Listen for hash changes
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    return (
        <main className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>수강생들의 생생한 후기</h1>
                <p className={styles.subtitle}>
                    SuperfastSAT와 함께 목표를 달성한<br />
                    모든 학생들의 이야기를 확인해보세요.
                </p>
            </div>

            <div className={styles.grid}>
                {reviews.map((review) => {
                    const isHighlighted = review.id === highlightedId;
                    return (
                        <ScrollReveal key={review.id}>
                            <div
                                id={`review-${review.id}`}
                                className={`${styles.card} ${isHighlighted ? styles.highlighted : ''}`}
                                style={{ scrollMarginTop: '150px' }}
                            >
                                <div className={styles.cardHeader}>
                                    <div className={styles.headerTop}>
                                        <span className={styles.categoryBadge}>{review.category}</span>
                                        <ArrowUpRight className={styles.actionIcon} size={24} />
                                    </div>
                                </div>

                                <h3 className={styles.reviewTitle}>{review.title}</h3>
                                {/* Full text displayed directly - Pinterest style */}
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
        </main>
    );
}
