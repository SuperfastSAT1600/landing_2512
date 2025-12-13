'use client';

import { Icon } from '@iconify/react';
import styles from './Features.module.css';
import { ScrollReveal } from './ScrollReveal';



export interface FeatureItem {
    title: string;
    description: string;
    link: string;
    image?: string;
}

interface FeaturesProps {
    items: FeatureItem[];
}

import Link from 'next/link';

const icons = [
    'streamline:camera-video',
    'streamline:computer-chip-1',
    'streamline:graph-arrow-increase',
    'streamline:help-question-1',
    'streamline:book-reading',
    'streamline:graph-bar-increase'
];

import { useEffect } from 'react';

export default function Features({ items }: FeaturesProps) {
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
        <section className={styles.features}>
            <div className={styles.backgroundContainer}>
                <div data-us-project="YxeCIfXUzLhuAd01z5RS" style={{ width: '100%', height: '100%' }}></div>
            </div>
            <div className={styles.container}>
                <ScrollReveal>
                    <div className={styles.header}>
                        <h2 className={styles.title}>왜 SuperfastSAT인가요?</h2>
                        <p className={styles.subtitle}>
                            단기간에 목표 점수를 달성하기 위한<br />
                            모든 것이 준비되어 있습니다.
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.grid}>
                    {items && items.map((feature, index) => {
                        const iconName = icons[index % icons.length];
                        return (
                            <ScrollReveal key={index} delay={index * 0.05}>
                                <Link href={feature.link || '#'} className={styles.card}>
                                    <Icon icon="lucide:arrow-up-right" className={styles.actionIcon} width="28" height="28" />

                                    <div className={styles.imageContainer}>
                                        {feature.image ? (
                                            <img
                                                src={feature.image}
                                                alt={feature.title}
                                                className={styles.featureImage}
                                            />
                                        ) : (
                                            <div className={styles.iconWrapper}>
                                                <Icon
                                                    icon={iconName}
                                                    width="40"
                                                    height="40"
                                                    className={styles.featureIcon}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.contentWrapper}>
                                        <h3 className={styles.cardTitle}>{feature.title}</h3>
                                        <p className={styles.cardDescription}>{feature.description}</p>
                                    </div>
                                </Link>
                            </ScrollReveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
