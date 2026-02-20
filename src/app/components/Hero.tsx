'use client';

import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import styles from './Hero.module.css';
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
                    <h1 className={styles.title}>
                        목표 점수에<br />
                        가장 빠르게<br />
                    </h1>
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