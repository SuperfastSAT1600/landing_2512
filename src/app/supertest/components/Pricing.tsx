'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Pricing.module.css';
import { PLANS, UPCOMING_TESTS, DISCOUNT_PERCENT, getDiscountedPrice, formatKRW } from '../data/plans';

const RECOMMENDED_FOR: Record<string, string> = {
    live: '완벽하게 준비하고 싶은 학생이라면',
    flex: '시간 맞추기 어려운 학생이라면',
    review: '해설만 필요한 학생이라면',
};

function PlanFeatureCard({ plan, delay }: { plan: (typeof PLANS)[number]; delay: number }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => el.classList.add(styles.visible), delay);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [delay]);

    return (
        <div ref={ref} className={`${styles.planCard} ${plan.highlighted ? styles.highlighted : ''}`}>
            {plan.highlighted && <span className={styles.recommendBadge}>가장 인기</span>}
            <div className={styles.recommendedFor}>
                <span className={styles.recommendedForText}>{RECOMMENDED_FOR[plan.id]}</span>
            </div>
            <p className={styles.planName}>{plan.name} Plan</p>
            <p className={styles.tagline}>{plan.tagline}</p>
            <hr className={styles.divider} />
            <ul className={styles.featureList}>
                {([
                    [plan.features.camera,   '테스트 리뷰 수업'],
                    [plan.features.analysis, '응시자 비교 리포트'],
                    [plan.features.vocab,    '단어 학습'],
                    [plan.features.lecture,  '해설 강의'],
                ] as [boolean | string, string][]).map(([available, label]) => (
                    <li key={label} className={styles.featureItem} data-available={!!available}>
                        <span className={`${styles.featureIcon} ${available ? styles.check : styles.cross}`}>
                            {available ? '✓' : '✕'}
                        </span>
                        <span>{label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function FirstDateRow() {
    const t = UPCOMING_TESTS[0];
    return (
        <div className={`${styles.scheduleRow} ${styles.scheduleRowDiscount}`}>
            <div className={styles.scheduleDateCol}>
                <span className={styles.discountBadge}>파이널 {t.discountPercent}% 할인</span>
                <span className={styles.scheduleDate}>{t.month}월 {t.day}일 ({t.weekday})</span>
            </div>
            {PLANS.map(plan => {
                const url = t.checkoutUrls[plan.id];
                return (
                    <a key={plan.id} href={url}
                        target={url !== '#' ? '_blank' : undefined}
                        rel={url !== '#' ? 'noopener noreferrer' : undefined}
                        className={styles.schedulePlanCell}>
                        <div className={styles.schedulePriceWrap}>
                            <span className={styles.schedulePriceOriginal}>{formatKRW(plan.price)}</span>
                            <span className={styles.schedulePriceFinal}>
                                {formatKRW(getDiscountedPrice(plan.price, t.discountPercent))}
                                <span className={styles.priceArrow}>↗</span>
                            </span>
                        </div>
                    </a>
                );
            })}
        </div>
    );
}

function OtherDatesRow() {
    const others = UPCOMING_TESTS.filter(t => t.discountPercent === 0);
    const [selectedDate, setSelectedDate] = useState(others[0]?.date ?? '');
    const selected = others.find(t => t.date === selectedDate) ?? others[0];

    return (
        <div className={`${styles.scheduleRow} ${styles.scheduleRowLast}`}>
            <div className={styles.scheduleDateCol}>
                <select
                    className={styles.scheduleSelect}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                >
                    {others.map(t => (
                        <option key={t.date} value={t.date}>
                            {t.month}월 {t.day}일 ({t.weekday})
                        </option>
                    ))}
                </select>
            </div>
            {PLANS.map(plan => {
                const url = selected?.checkoutUrls[plan.id] ?? '#';
                return (
                    <a key={plan.id} href={url}
                        target={url !== '#' ? '_blank' : undefined}
                        rel={url !== '#' ? 'noopener noreferrer' : undefined}
                        className={styles.schedulePlanCell}>
                        <div className={styles.schedulePriceWrap}>
                            <span className={styles.schedulePriceFinal}>
                                {formatKRW(plan.price)}
                                <span className={styles.priceArrow}>↗</span>
                            </span>
                        </div>
                    </a>
                );
            })}
        </div>
    );
}

export default function Pricing() {
    return (
        <section id="pricing" className={styles.section} aria-labelledby="pricing-heading">
            <div className={styles.inner}>
                <p className={styles.sectionLabel}>상품 선택</p>
                <h2 id="pricing-heading" className={styles.title}>
                    나에게 맞는 플랜은?
                </h2>

                <div className={styles.planGrid}>
                    {PLANS.map((plan, i) => (
                        <PlanFeatureCard key={plan.id} plan={plan} delay={i * 100} />
                    ))}
                </div>

                <div className={styles.scheduleSection}>
                    <p className={styles.scheduleTitle}>SuperTest 구매하기</p>

                    <div className={styles.scheduleHeader}>
                        <div className={styles.scheduleDateCol}>일정</div>
                        {PLANS.map(p => (
                            <div key={p.id} className={styles.schedulePlanCol}>{p.name}</div>
                        ))}
                    </div>

                    <FirstDateRow />
                    <OtherDatesRow />
                </div>

                <p className={styles.vat}>
                    * 모든 금액은 부가세가 포함된 가격입니다. 결제 버튼 클릭 시 외부 결제 페이지로 이동합니다.
                </p>
            </div>
        </section>
    );
}
