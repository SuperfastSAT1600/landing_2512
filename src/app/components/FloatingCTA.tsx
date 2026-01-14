'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import styles from './FloatingCTA.module.css';

const PRE_REGISTER_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfEhZcRual8i-cuigcQZWp1FkeBkAX4MTTQIsp-yHrkGO7H9g/viewform";

export default function FloatingCTA() {
    const [isVisible, setIsVisible] = useState(false);
    const [claimedCount, setClaimedCount] = useState(14);
    const pathname = usePathname();

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    // Don't show on admin pages
    if (pathname?.startsWith('/admin')) return null;

    if (!isVisible) return null;

    return (
        <div className={styles.wrapper}>
            <div className={styles.container}>
                {/* Tooltip Bubble */}
                <div className={styles.bubble}>
                    현재 <span className={styles.highlightCount}>{claimedCount}</span>명 할인 혜택 수령!
                    <div className={styles.bubbleArrow}></div>
                </div>

                {/* Main CTA Button */}
                <Link href={PRE_REGISTER_URL} target="_blank" rel="noopener noreferrer" className={styles.mainBtn}>
                    ⏳26년 3월 대비반 얼리버드 30% 할인 받기
                </Link>
            </div>
        </div>
    );
}
