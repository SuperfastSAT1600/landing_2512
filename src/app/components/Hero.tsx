'use client';

import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import styles from './Hero.module.css';
import { useEffect } from 'react';
import LiveStatus from './LiveStatus';

declare global {
    interface Window {
        UnicornStudio: any;
    }
}

interface HeroProps {
    ctaText?: string;
    ctaLink?: string;
}

export default function Hero({ ctaText, ctaLink }: HeroProps) {
    useEffect(() => {
        const loadUnicornScript = () => {
            if (!window.UnicornStudio) {
                window.UnicornStudio = { isInitialized: false };
                const script = document.createElement("script");
                script.src = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.5.2/dist/unicornStudio.umd.js";
                script.onload = function () {
                    if (!window.UnicornStudio.isInitialized) {
                        try {
                            // @ts-ignore
                            UnicornStudio.init();
                            window.UnicornStudio.isInitialized = true;
                        } catch (e) {
                            console.error("Unicorn Studio init failed:", e);
                        }
                    }
                };
                document.head.appendChild(script);
            } else if (!window.UnicornStudio.isInitialized) {
                // If script is already there but not init
                try {
                    // @ts-ignore
                    if (typeof UnicornStudio !== 'undefined') UnicornStudio.init();
                } catch (e) {
                    console.error("Unicorn Studio init failed:", e);
                }
            }
        };

        loadUnicornScript();
    }, []);

    return (
        <section className={styles.hero}>
            {/* Unicorn Studio Background */}
            <div className={styles.backgroundContainer}>
                <div data-us-project-src="/unicorn-hero.json" style={{ width: '100%', height: '100%' }}></div>
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
                            {ctaText || "25년 11월 시험 목표달성 학생 인터뷰"}
                            <ArrowRight size={20} />
                        </Link>
                    </div>


                </div>
            </div>
        </section>
    );
}
