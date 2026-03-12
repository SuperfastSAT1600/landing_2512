'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import styles from './Features.module.css';
import type { FeatureItem } from '@/lib/config';

interface FeaturesProps {
    items: FeatureItem[];
}

const FALLBACK_PALETTES = [
    [styles.circle1_1, styles.circle2_1],
    [styles.circle1_2, styles.circle2_2],
    [styles.circle1_3, styles.circle2_3],
] as const;

export default function Features({ items }: FeaturesProps) {
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [warpIndex, setWarpIndex] = useState<number | null>(null);

    const handleCardClick = (index: number, link: string) => {
        if (warpIndex !== null) return;
        setWarpIndex(index);
        setTimeout(() => {
            router.push(link);
        }, 550);
    };

    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        checkScroll();
        el.addEventListener('scroll', checkScroll, { passive: true });
        window.addEventListener('resize', checkScroll);
        return () => {
            el.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [checkScroll]);

    const scroll = (direction: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const cardWidth = el.querySelector(`.${styles.card}`)?.clientWidth ?? 360;
        const gap = 20;
        const distance = cardWidth + gap;
        el.scrollBy({ left: direction === 'left' ? -distance : distance, behavior: 'smooth' });
    };

    return (
        <section className={styles.features}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.sectionTitle}>
                        왜 SuperfastSAT인가요?
                    </h2>

                    <motion.p
                        className={styles.subtitle}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true, margin: "0px 0px -60px 0px" }}
                        transition={{ duration: 0.35, delay: 0.3 }}
                    >
                        단기간에 목표 점수를 달성하기 위한<br />
                        모든 것이 준비되어 있습니다.
                    </motion.p>
                </div>

                {/* Carousel wrapper */}
                <div className={styles.carouselWrapper}>
                    {/* Navigation arrows */}
                    <button
                        className={`${styles.navBtn} ${styles.navBtnLeft} ${!canScrollLeft ? styles.navBtnHidden : ''}`}
                        onClick={() => scroll('left')}
                        aria-label="이전 카드"
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>

                    <button
                        className={`${styles.navBtn} ${styles.navBtnRight} ${!canScrollRight ? styles.navBtnHidden : ''}`}
                        onClick={() => scroll('right')}
                        aria-label="다음 카드"
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>

                    <div className={styles.scrollRow} ref={scrollRef}>
                        {items.map((feature, index) => {
                            const [c1, c2] = FALLBACK_PALETTES[index % 3];
                            const isWarping = warpIndex === index;
                            const isSibling = warpIndex !== null && warpIndex !== index;
                            return (
                                <div
                                    key={index}
                                    className={`${styles.card} ${isWarping ? styles.cardWarp : ''} ${isSibling ? styles.cardFadeOut : ''}`}
                                    onClick={() => handleCardClick(index, feature.link || '#')}
                                >
                                    {/* Background visual */}
                                    <div className={styles.cardBg}>
                                        {feature.image ? (
                                            // REQ-002: next/image for lazy-loading + automatic WebP/AVIF
                                            <Image
                                                fill
                                                src={feature.image}
                                                alt=""
                                                className={styles.cardImage}
                                                sizes="(max-width: 480px) 260px, (max-width: 768px) 300px, 33vw"
                                            />
                                        ) : (
                                            <div className={styles.cardVisualFallback}>
                                                <div className={`${styles.circle} ${c1}`} />
                                                <div className={`${styles.circle} ${c2}`} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content overlay */}
                                    <div className={styles.cardContent}>
                                        <div className={styles.cardTextGrid}>
                                            <div className={styles.cardIndex}>
                                                {String(index + 1).padStart(2, '0')}
                                            </div>
                                            <h3 className={styles.cardTitle}>{feature.title}</h3>
                                            <p className={styles.cardDescription}>{feature.description}</p>
                                        </div>
                                        <div className={styles.learnMore}>
                                            자세히 알아보기
                                            <ChevronRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
