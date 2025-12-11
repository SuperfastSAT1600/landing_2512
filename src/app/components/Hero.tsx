'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star, Quote } from 'lucide-react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import styles from './Hero.module.css';
import { ScrollReveal } from './ScrollReveal';
import LiveStatus from './LiveStatus';


interface HeroProps {
    ctaText?: string;
    ctaLink?: string;
}

export default function Hero({ ctaText, ctaLink }: HeroProps) {
    const containerRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"]
    });

    // Mouse interaction
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseX = useSpring(x, { stiffness: 50, damping: 20 });
    const mouseY = useSpring(y, { stiffness: 50, damping: 20 });

    function handleMouseMove(e: React.MouseEvent) {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        x.set((clientX / innerWidth - 0.5) * 20);
        y.set((clientY / innerHeight - 0.5) * 20);
    }

    const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

    return (
        <section
            ref={containerRef}
            className={styles.hero}
            onMouseMove={handleMouseMove}
        >
            <motion.div style={{ y: bgY }} className={styles.bgWrapper}>
                <Image
                    src="/hero-background.png"
                    alt="Speed Light Trails"
                    fill
                    className={styles.bgImage}
                    priority
                />
                <div className={styles.overlay} />
            </motion.div>

            <div className={styles.container}>
                <div className={styles.content}>
                    <ScrollReveal>
                        <LiveStatus />
                    </ScrollReveal>

                    <ScrollReveal delay={0.1}>
                        <h1 className={styles.title}>
                            목표 점수에<br />
                            가장 빠르게<br />
                            <span className={styles.highlight}>SuperfastSAT</span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal delay={0.2}>
                        <p className={styles.description}>
                            <strong>목표 점수를 위한 가장 빠른 길</strong><br />
                            SuperfastSAT가 제시합니다.<br />
                            저희와 함께 수직 상승하는 점수를 경험하세요.
                        </p>
                    </ScrollReveal>

                    <ScrollReveal delay={0.3}>
                        <Link href={ctaLink || "/blog"} className={styles.primaryBtn}>
                            {ctaText || "25년 11월 시험 목표달성 학생 인터뷰"}
                            <ArrowRight size={20} />
                        </Link>
                    </ScrollReveal>
                </div>

                <div className={styles.visualArea}>
                    <div className={styles.graphContainer}>
                        {/* Abstract Glowing Graph: Symbolizing Score Growth */}
                        <div className={styles.graphBar} style={{ height: '40%', animationDelay: '0s' }} />
                        <div className={styles.graphBar} style={{ height: '60%', animationDelay: '0.2s' }} />
                        <div className={styles.graphBar} style={{ height: '50%', animationDelay: '0.4s' }} />
                        <div className={styles.graphBar} style={{ height: '85%', animationDelay: '0.6s' }} />
                        <div className={styles.graphBar} style={{ height: '100%', animationDelay: '0.8s' }} />

                        {/* Glow Effect Background */}
                        <div className={styles.graphGlow} />
                    </div>
                </div>
            </div>
        </section>
    );
}
