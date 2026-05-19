'use client';

import { useState, useEffect } from 'react';
import styles from './HeroLiveInfo.module.css';
import { TEST_SCHEDULE } from '../data/plans';

function getNextTestTarget(): Date | null {
    const now = new Date();
    for (const item of TEST_SCHEDULE) {
        // 시험 시작: 해당 날짜 09:00 KST (UTC+9)
        const target = new Date(`${item.date}T09:00:00+09:00`);
        if (target > now) return target;
    }
    return null;
}

function calcDiff(target: Date): { days: number; hours: number; minutes: number; seconds: number } {
    const diff = Math.max(0, target.getTime() - Date.now());
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
}

function pad(n: number) {
    return String(n).padStart(2, '0');
}

export default function HeroLiveInfo() {
    const target = getNextTestTarget();
    const [diff, setDiff] = useState(target ? calcDiff(target) : null);
    const [spots, setSpots] = useState<number | null>(null);

    // 카운트다운
    useEffect(() => {
        if (!target) return;
        const id = setInterval(() => setDiff(calcDiff(target)), 1000);
        return () => clearInterval(id);
    }, [target]);

    // 남은 자리 fetch
    useEffect(() => {
        fetch('/api/supertest/spots')
            .then(r => r.json())
            .then(d => setSpots(d.remainingSpots ?? null))
            .catch(() => {});
    }, []);

    const nextItem = TEST_SCHEDULE.find(item => new Date(`${item.date}T09:00:00+09:00`) > new Date());
    const nextLabel = nextItem
        ? nextItem.label.split(' — ')[1] // e.g. "2026년 5월 30일 (토)"
        : null;

    return (
        <div className={styles.wrap}>
            {diff ? (
                <div className={styles.countdownWrap}>
                    <p className={styles.countdownLabel}>
                        <span className={styles.liveDot} aria-hidden="true" />
                        {nextLabel ? `${nextLabel} SuperTest까지` : '다음 SuperTest까지'}
                    </p>
                    <div className={styles.countdown} aria-label="다음 시험까지 남은 시간">
                        {diff.days > 0 && (
                            <>
                                <div className={styles.unit}>
                                    <span className={styles.number}>{diff.days}</span>
                                    <span className={styles.label}>일</span>
                                </div>
                                <span className={styles.sep} aria-hidden="true">:</span>
                            </>
                        )}
                        <div className={styles.unit}>
                            <span className={styles.number}>{pad(diff.hours)}</span>
                            <span className={styles.label}>시간</span>
                        </div>
                        <span className={styles.sep} aria-hidden="true">:</span>
                        <div className={styles.unit}>
                            <span className={styles.number}>{pad(diff.minutes)}</span>
                            <span className={styles.label}>분</span>
                        </div>
                        <span className={styles.sep} aria-hidden="true">:</span>
                        <div className={styles.unit}>
                            <span className={styles.number}>{pad(diff.seconds)}</span>
                            <span className={styles.label}>초</span>
                        </div>
                    </div>
                </div>
            ) : (
                <p className={styles.noNext}>다음 시험 일정을 준비 중입니다.</p>
            )}

            {spots !== null && (
                <div className={styles.spots}>
                    <span
                        className={`${styles.spotsDot} ${spots > 10 ? styles.plenty : ''}`}
                        aria-hidden="true"
                    />
                    이번 시험 남은 자리
                    <span className={styles.spotsCount}>{spots}석</span>
                </div>
            )}
        </div>
    );
}
