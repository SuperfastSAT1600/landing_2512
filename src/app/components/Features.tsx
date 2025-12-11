import { Video, Cpu, TrendingUp, FileQuestion, BookOpen, BarChart, ArrowUpRight } from 'lucide-react';
import styles from './Features.module.css';
import { ScrollReveal } from './ScrollReveal';



export interface FeatureItem {
    title: string;
    description: string;
    link: string;
}

interface FeaturesProps {
    items: FeatureItem[];
}

import Link from 'next/link';

const icons = [Video, Cpu, TrendingUp, FileQuestion, BookOpen, BarChart];

export default function Features({ items }: FeaturesProps) {
    return (
        <section className={styles.features}>
            <div className={styles.container}>
                <ScrollReveal>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Why SuperfastSAT?</h2>
                        <p className={styles.subtitle}>
                            단기간에 목표 점수를 달성하기 위한<br />
                            모든 것이 준비되어 있습니다.
                        </p>
                    </div>
                </ScrollReveal>

                <div className={styles.grid}>
                    {items && items.map((feature, index) => {
                        const Icon = icons[index % icons.length];
                        return (
                            <ScrollReveal key={index} delay={index * 0.05}>
                                {/* Wrap in Link if link exists, otherwise div */}
                                {feature.link && feature.link !== '#' ? (
                                    <Link href={feature.link} className={styles.card}>
                                        <ArrowUpRight className={styles.actionIcon} size={28} />
                                        <div className={styles.iconWrapper}>
                                            <Icon
                                                size={48}
                                                color="#2563EB"
                                                strokeWidth={1.5}
                                                style={{ opacity: 0.9 }}
                                            />
                                        </div>
                                        <h3 className={styles.cardTitle}>{feature.title}</h3>
                                        <p className={styles.cardDescription}>{feature.description}</p>
                                    </Link>
                                ) : (
                                    <div className={styles.card}>
                                        <ArrowUpRight className={styles.actionIcon} size={28} />
                                        <div className={styles.iconWrapper}>
                                            <Icon
                                                size={48}
                                                color="#2563EB"
                                                strokeWidth={1.5}
                                                style={{ opacity: 0.9 }}
                                            />
                                        </div>
                                        <h3 className={styles.cardTitle}>{feature.title}</h3>
                                        <p className={styles.cardDescription}>{feature.description}</p>
                                    </div>
                                )}
                            </ScrollReveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
