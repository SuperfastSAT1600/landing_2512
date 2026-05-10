'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './Hero.module.css';
import HeroBackground from './HeroBackground';


interface HeroProps {
    ctaText?: string;
    ctaLink?: string;
}

function normalizeCtaLink(link?: string): string {
    if (!link) return '/curriculum';
    if (link.startsWith('/') || link.startsWith('http')) return link;
    return `/blog/${link}`;
}

export default function Hero({ ctaText, ctaLink }: HeroProps) {
    const titleRef = useRef<HTMLHeadingElement>(null);
    const [dynamicCta, setDynamicCta] = useState({
        text: ctaText,
        link: ctaLink,
    });

    useEffect(() => {
        fetch('/api/hero-config')
            .then(r => r.json())
            .then(data => {
                setDynamicCta({ text: data.ctaText, link: data.ctaLink });
            })
            .catch(() => {});
    }, []);

    const resolvedLink = normalizeCtaLink(dynamicCta.link);

    return (
        <section className={styles.hero}>
            {/* Custom Background */}
            <div className={styles.backgroundContainer}>
                <HeroBackground titleRef={titleRef} />
            </div>

            {/* Content Overlay */}
            <div className={styles.content}>
                <div className={styles.mainContent}>
                    <h1 ref={titleRef} className={styles.title}>
                        목표 점수에<br />
                        가장 빠르게<br />
                    </h1>
                    <div className={styles.ctaGroup}>
                        <Link
                            href={resolvedLink}
                            className={styles.primaryBtn}
                            onClick={() => window.fbq?.('track', 'Lead', {
                                content_name: 'hero_cta',
                                currency: 'KRW',
                                value: 0,
                            })}
                        >
                            {dynamicCta.text || "25년 11월 SAT목표 점수 달성 인터뷰"}
                            <ArrowRight size={20} />
                        </Link>
                    </div>


                </div>
            </div>
        </section>
    );
}