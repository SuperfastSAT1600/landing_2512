'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './FloatingCTA.module.css';
import { useLiveStatus } from '../context/LiveStatusContext';
import ConsultModal from './ConsultModal';

const KAKAO_URL = "#"; // Replace with actual KakaoTalk channel URL

interface DiscountButton {
    label: string;
    slug: string;
}

export default function FloatingCTA() {
    const [isVisible, setIsVisible] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
    if (pathname?.startsWith('/reviews/write')) return null;
    if (!isVisible) return null;

    const handleConsult = () => setIsModalOpen(true);

    const handleModalSuccess = () => {
        pushMessage({ text: '*** 님이 상담 예약을 신청하셨습니다', type: 'green' });
    };

    const handleKakao = () => {
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

            {isModalOpen && (
                <ConsultModal
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleModalSuccess}
                />
            )}
        </>
    );
}
