'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './FloatingCTA.module.css';
import { useLiveStatus } from '../context/LiveStatusContext';

const CONSULT_URL = "https://forms.gle/BsGf1bixgpr1TLNH6";
const KAKAO_URL = "https://kakao-redirect-chi.vercel.app/?src=writerB_260221_튜터링_랜딩_페이지";

interface DiscountButton {
    label: string;
    slug: string;
}

export default function FloatingCTA() {
    const [isVisible, setIsVisible] = useState(false);
    const [discount, setDiscount] = useState<DiscountButton | null>(null);
    const pathname = usePathname();
    const { pushMessage } = useLiveStatus();

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        fetch('/api/featured-post')
            .then(r => r.json())
            .then(data => { if (data.success && data.discount) setDiscount(data.discount); })
            .catch(() => {});
    }, []);

    if (pathname?.startsWith('/admin')) return null;
    if (pathname?.startsWith('/reports')) return null;
    if (pathname?.startsWith('/reviews/write')) return null;
    if (pathname === '/diagnosis') return null;
    if (!isVisible) return null;

    const handleConsult = () => {
        window.fbq?.('track', 'Lead', { content_name: 'phone_consultation' });
        window.open(CONSULT_URL, '_blank', 'noopener,noreferrer');
    };

    const handleKakao = () => {
        window.fbq?.('track', 'Lead', { content_name: 'kakao_consultation' });
        pushMessage({ text: '*** 님이 카카오톡 상담을 시작하셨습니다', type: 'green' });
        window.open(KAKAO_URL, '_blank', 'noopener,noreferrer');
    };

    return (
        <>
            <div className={styles.wrapper}>
                <div className={styles.container}>
                    {/* Discount Announcement */}
                    {discount && (
                        <Link href={`/blog/${discount.slug}`} className={styles.announcementLink}>
                            {discount.label}
                        </Link>
                    )}

                    {/* Button Group */}
                    <div className={styles.buttonGroup}>
                        <button onClick={handleConsult} className={styles.mainBtn}>
                            📞전화상담 예약
                        </button>
                        <button onClick={handleKakao} className={styles.kakaoBtn}>
                            💬즉시 카톡상담
                        </button>
                    </div>
                </div>
            </div>

        </>
    );
}
