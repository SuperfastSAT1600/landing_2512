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

export default function Hero() {
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
                <div data-us-project="ymb9b8sUn5vBWWI1toQZ" style={{ width: '100%', height: '100%' }}></div>
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
                        <strong>목표 점수를 위한 가장 빠른 길</strong><br />
                        SuperfastSAT가 제시합니다.<br />
                        저희와 함께 수직 상승하는 점수를 경험하세요.
                    </p>

                    <div className={styles.ctaGroup}>
                        <Link href="/curriculum" className={styles.primaryBtn}>
                            25년 11월 시험 목표달성 학생 인터뷰
                            <ArrowRight size={20} />
                        </Link>
                    </div>


                </div>
            </div>
        </section>
    );
}
