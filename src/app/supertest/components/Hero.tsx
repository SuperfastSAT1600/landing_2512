'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './Hero.module.css';
import HeroLiveInfo from './HeroLiveInfo';

export default function Hero() {
    const sectionRef = useRef<HTMLElement>(null);
    const bgRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            const section = sectionRef.current;
            if (!section) return;

            const progress = Math.min(window.scrollY / section.offsetHeight, 1);

            if (bgRef.current) {
                const scale = 1 + progress * 0.08;
                bgRef.current.style.transform = `scale(${scale})`;
            }

            if (innerRef.current) {
                const opacity = Math.max(0, 1 - progress * 1.8);
                const translateY = progress * -30;
                innerRef.current.style.opacity = String(opacity);
                innerRef.current.style.transform = `translateY(${translateY}px)`;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <section ref={sectionRef} className={styles.hero} aria-labelledby="hero-heading">
            <div ref={bgRef} className={styles.bgImage} aria-hidden="true">
                <Image
                    src="/supertest_background.png"
                    alt=""
                    fill
                    style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
                    priority
                    quality={80}
                />
            </div>
            <div className={styles.bgOverlay} aria-hidden="true" />
            <div className={styles.glow} aria-hidden="true" />
            <div ref={innerRef} className={styles.inner}>
                <h1 id="hero-heading" className={styles.headline}>
                    실전의 긴장감
                    <br />
                    그 이상의 난이도
                    <br />
                    <span className={styles.highlight}>SuperTest</span>
                </h1>

                <p className={styles.sub}>
                    혼자 푸는 쉬운 모의고사는 그만.
                    <br />
                    다른 학생들과 함께 실전처럼 시험 보고
                    <br />
                    정밀 분석 리포트로 약점도 확인하세요.
                </p>

                <HeroLiveInfo />
            </div>
        </section>
    );
}
