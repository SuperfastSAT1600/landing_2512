'use client';

import Link from 'next/link';
import { Star, Quote, ArrowRight, ArrowUpRight } from 'lucide-react';
import styles from './Testimonials.module.css';
import { ScrollReveal } from './ScrollReveal';
import { ReviewData } from '../../lib/reviews-data';

interface TestimonialsProps {
    reviews?: ReviewData[];
}

export default function Testimonials({ reviews = [] }: TestimonialsProps) {
    // Only show first 3 on landing page
    const displayedReviews = reviews.slice(0, 3);

    return (
        <section className={styles.testimonials}>
            <div className={styles.container}>
                <ScrollReveal>
                    <div className={styles.header}>
                        <h2 className={styles.title}>학생과 학부모님들의 후기</h2>
                        <p className={styles.subtitle}>
                            많은 학생들이 목표 점수를 달성했습니다.<br />
                            다음 주인공은 여러분입니다.
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.grid}>
                    {displayedReviews.map((review) => (
                        <ScrollReveal key={review.id}>
                            <Link href={`/reviews#review-${review.id}`} className={styles.card}>
                                <ArrowUpRight className={styles.actionIcon} size={24} />
                                <div className={styles.cardHeader}>
                                    <div className={styles.stars}>
                                        {[...Array(review.rating)].map((_, i) => (
                                            <Star key={i} size={16} fill="#3B82F6" color="#3B82F6" />
                                        ))}
                                    </div>
                                    <span className={styles.categoryBadge}>{review.category}</span>
                                </div>

                                <h3 className={styles.reviewTitle}>{review.title}</h3>
                                <p className={styles.content}>"{review.content}"</p>

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
                            </Link>
                        </ScrollReveal>
                    ))}
                </div>

                <div className={styles.moreBtnContainer}>
                    <Link href="/reviews" className={styles.moreBtn}>
                        후기 더 보기
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        </section>
    );
}
