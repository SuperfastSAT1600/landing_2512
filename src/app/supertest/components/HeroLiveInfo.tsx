'use client';

import { useState, useEffect } from 'react';
import styles from './HeroLiveInfo.module.css';

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

function formatDateLabel(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00`);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

export default function HeroLiveInfo() {
    const [nextTestDate, setNextTestDate] = useState<string | null>(null);
    const [spots, setSpots] = useState<number | null>(null);
    const [diff, setDiff] = useState<ReturnType<typeof calcDiff> | null>(null);

    useEffect(() => {
        fetch('/api/supertest/spots')
            .then(r => r.json())
            .then(d => {
                setSpots(d.remainingSpots ?? null);
                if (d.nextTestDate) setNextTestDate(d.nextTestDate);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!nextTestDate) return;
        const target = new Date(`${nextTestDate}T09:00:00+09:00`);
        if (target <= new Date()) return;

        setDiff(calcDiff(target));
        const id = setInterval(() => setDiff(calcDiff(target)), 1000);
        return () => clearInterval(id);
    }, [nextTestDate]);

    const dateLabel = nextTestDate ? formatDateLabel(nextTestDate) : null;

    return (
        <div className={styles.wrap}>
            {diff ? (
                <div className={styles.countdownWrap}>
                    <p className={styles.countdownLabel}>
                        <span className={styles.liveDot} aria-hidden="true" />
                        {dateLabel ? `${dateLabel} SuperTest까지` : '다음 SuperTest까지'}
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
