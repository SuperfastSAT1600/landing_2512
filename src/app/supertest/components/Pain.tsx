'use client';

import { useEffect, useRef } from 'react';
import styles from './Pain.module.css';

function useIntersection(ref: React.RefObject<Element | null>, threshold = 0.1) {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add(styles.visible);
                    observer.disconnect();
                }
            },
            { threshold }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, threshold]);
}

/* ── Visual panels ──────────────────────────────────────────── */

function V1Anxiety() {
    return (
        <div className={styles.v1Wrap} aria-hidden="true">
            <div className={`${styles.v1Ring} ${styles.v1r1}`} />
            <div className={`${styles.v1Ring} ${styles.v1r2}`} />
            <div className={`${styles.v1Ring} ${styles.v1r3}`} />
            <div className={styles.v1Core}>
                <span className={styles.v1Label}>BPM</span>
                <span className={styles.v1Num}>140</span>
            </div>
        </div>
    );
}

function V2Blindspot() {
    const weakSet = new Set([2, 6, 10]);
    return (
        <div className={styles.v2Grid} aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
                <div
                    key={i}
                    className={`${styles.v2Dot} ${weakSet.has(i) ? styles.v2Weak : ''}`}
                />
            ))}
        </div>
    );
}

function V3Loop() {
    return (
        <div className={styles.v3Wrap} aria-hidden="true">
            <div className={styles.v3Ring} />
            <div className={styles.v3Inner}>
                <div className={`${styles.v3Bar} ${styles.v3b1}`} />
                <div className={`${styles.v3Bar} ${styles.v3b2}`} />
                <div className={`${styles.v3Bar} ${styles.v3b3}`} />
            </div>
        </div>
    );
}

function V4Skip() {
    return (
        <div className={styles.v4Lines} aria-hidden="true">
            <div className={styles.v4Row}>
                <span className={styles.v4Block} data-w="48" />
                <span className={styles.v4Block} data-w="32" />
                <span className={styles.v4Block} data-w="56" />
            </div>
            <div className={styles.v4Row}>
                <span className={styles.v4Block} data-w="36" />
                <span className={`${styles.v4Block} ${styles.v4Unknown}`} data-w="52" />
                <span className={styles.v4Block} data-w="40" />
            </div>
            <div className={styles.v4Row}>
                <span className={styles.v4Block} data-w="60" />
                <span className={styles.v4Block} data-w="28" />
                <span className={styles.v4Block} data-w="44" />
            </div>
            <div className={styles.v4Row}>
                <span className={styles.v4Block} data-w="42" />
                <span className={styles.v4Block} data-w="50" />
            </div>
        </div>
    );
}

/* ── Card data ──────────────────────────────────────────────── */

const CARDS = [
    {
        num: '01',
        prefix: '긴장감을 ',
        verb: '관리한 적 없으니까',
        verbStyle: 'shake' as const,
        desc: '실전에서는 긴장감 관리가 점수를 결정합니다.\n그런데 혼자 공부할 때는 긴장할 상황 자체가 없습니다.\n그래서 긴장감을 다뤄본 적 없이 시험장에 들어서게 됩니다.',
        Visual: V1Anxiety,
    },
    {
        num: '02',
        prefix: '약점 문제를 ',
        verb: '확인한 적 없으니까',
        verbStyle: 'blurIn' as const,
        desc: '약점이 어디인지 알아야 점수를 높일 수 있습니다.\n그런데 틀린 문제를 확인하는 것만으로 충분하다고 느끼게 됩니다.\n그래서 같은 유형의 약점을 발견하지 못한 채 시험을 반복합니다.',
        Visual: V2Blindspot,
    },
    {
        num: '03',
        prefix: '같은 실수를 ',
        verb: '반복하니까',
        verbStyle: 'repeat' as const,
        desc: '실수는 원인을 알아야 다음에 멈출 수 있습니다.\n그런데 오답을 볼 때 왜 틀렸는지까지 분석하지 않게 됩니다.\n그래서 같은 유형의 실수가 다음 시험에서도 반복됩니다.',
        Visual: V3Loop,
    },
    {
        num: '04',
        prefix: '모르는 단어를 ',
        verb: '그냥 넘기니까',
        verbStyle: 'skip' as const,
        desc: '모르는 단어 하나가 지문 전체의 이해를 무너뜨립니다.\n그런데 시간이 부족하면 일단 넘기고 보는 게 습관이 됩니다.\n그래서 핵심 어휘를 모른 채 지문 전체를 오해하게 됩니다.',
        Visual: V4Skip,
    },
] as const;

/* ── Component ──────────────────────────────────────────────── */

export default function Pain() {
    const ref = useRef<HTMLDivElement>(null);
    useIntersection(ref);

    return (
        <section className={styles.section} aria-labelledby="pain-heading">
            <div className={styles.intro}>
                <p className={styles.sectionLabel}>솔직한 이야기</p>
                <h2 id="pain-heading" className={styles.introTitle}>
                    왜 점수가 안 오를까요?
                </h2>
                <p className={styles.introDesc}>
                    열심히 하는데도 점수가 제자리인 이유가 있습니다.
                </p>
            </div>

            <div className={styles.cards} ref={ref}>
                {CARDS.map((card, i) => (
                    <article
                        key={card.num}
                        className={styles.card}
                        style={{ '--i': i } as React.CSSProperties}
                    >
                        <div className={styles.visual}>
                            <card.Visual />
                        </div>
                        <div className={styles.content}>
                            <span className={styles.cardNum} aria-hidden="true">{card.num}</span>
                            <h3 className={styles.cardTitle}>
                                {card.prefix}
                                <span className={`${styles.verb} ${styles[card.verbStyle]}`}>
                                    {card.verb}
                                </span>
                            </h3>
                            <p className={styles.cardDesc}>
                                {card.desc.split('\n').map((line, j) => (
                                    <span key={j} className={styles.descLine}>{line}</span>
                                ))}
                            </p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
