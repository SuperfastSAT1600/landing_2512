'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Pricing.module.css';
import { PLANS, getTestSplit, getDiscountedPrice, formatKRW, type TestDatePricing } from '../data/plans';

const RECOMMENDED_FOR: Record<string, string> = {
    live: '완벽하게 준비하고 싶다면',
    flex: '스케줄이 많은 학생이라면',
    review: '혼자 공부가 편하다면',
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
                    [plan.features.camera,   '대표코치 해설강의'],
                    [plan.features.analysis, '응시자 비교 리포트'],
                    [plan.features.vocab,    '단어 학습'],
                    [plan.features.lecture,  'ai튜터 리뷰'],
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

function FirstDateRow({ test }: { test: TestDatePricing }) {
    return (
        <div className={`${styles.scheduleRow} ${styles.scheduleRowDiscount}`}>
            <div className={styles.scheduleDateCol}>
                <span className={styles.discountBadge}>파이널 {test.discountPercent}% 할인</span>
                <span className={styles.scheduleDate}>{test.month}월 {test.day}일 ({test.weekday})</span>
            </div>
            {PLANS.map(plan => {
                const url = test.checkoutUrls[plan.id];
                return (
                    <a key={plan.id} href={url}
                        target={url !== '#' ? '_blank' : undefined}
                        rel={url !== '#' ? 'noopener noreferrer' : undefined}
                        className={styles.schedulePlanCell}>
                        <div className={styles.schedulePriceWrap}>
                            <span className={styles.schedulePriceOriginal}>{formatKRW(plan.price)}</span>
                            <span className={styles.schedulePriceFinal}>
                                {formatKRW(getDiscountedPrice(plan.price, test.discountPercent))}
                                <span className={styles.priceArrow}>↗</span>
                            </span>
                        </div>
                    </a>
                );
            })}
        </div>
    );
}

function OtherDatesRow({ tests }: { tests: TestDatePricing[] }) {
    const [selectedDate, setSelectedDate] = useState(tests[0]?.date ?? '');
    const selected = tests.find(t => t.date === selectedDate) ?? tests[0];

    if (tests.length === 0) return null;

    return (
        <div className={`${styles.scheduleRow} ${styles.scheduleRowLast}`}>
            <div className={styles.scheduleDateCol}>
                <select
                    className={styles.scheduleSelect}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                >
                    {tests.map(t => (
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

export default function Pricing({ nextTestDate }: { nextTestDate: string }) {
    const { discountTest, otherTests } = getTestSplit(nextTestDate);

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

                    {discountTest && <FirstDateRow test={discountTest} />}
                    <OtherDatesRow tests={otherTests} />
                </div>

                <p className={styles.vat}>
                    * 모든 금액은 부가세가 포함된 가격입니다. 결제 버튼 클릭 시 외부 결제 페이지로 이동합니다.
                </p>
            </div>
        </section>
    );
}
