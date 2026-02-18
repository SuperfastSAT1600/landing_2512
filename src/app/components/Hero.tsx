'use client';

import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import styles from './Hero.module.css';
import LiveStatus from './LiveStatus';
import HeroBackground from './HeroBackground';


interface HeroProps {
    ctaText?: string;
    ctaLink?: string;
}

export default function Hero({ ctaText, ctaLink }: HeroProps) {

    return (
        <section className={styles.hero}>
            {/* Custom Background */}
            <div className={styles.backgroundContainer}>
                <HeroBackground />
            </div>

            {/* Content Overlay */}
            <div className={styles.content}>
                <div className={styles.mainContent}>
                    <LiveStatus />

                    <h1 className={styles.title}>
                        목표 점수에<br />
                        가장 빠르게<br />
                        <span className={styles.highlight}>SuperfastSAT</span>
                    </h1>

                    <p className={styles.description}>
                        저희와 함께 수직 상승하는<br />
                        SAT점수를 경험하세요.<br />
                    </p>

                    <div className={styles.ctaGroup}>
                        <Link href={ctaLink || "/curriculum"} className={styles.primaryBtn}>
                            {ctaText || "25년 11월 SAT목표 점수 달성 인터뷰"}
                            <ArrowRight size={20} />
                        </Link>
                    </div>


                </div>
            </div>
        </section>
    );
}