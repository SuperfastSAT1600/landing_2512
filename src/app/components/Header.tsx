'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './Header.module.css';
import LiveStatus from './LiveStatus';

export default function Header() {
    const [scrolled, setScrolled] = useState(false);

    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Helper to check for admin pages
    if (pathname?.startsWith('/admin')) return null;

    return (
        <header className={`${styles.header} ${scrolled ? styles.glass : styles.glass /* Always glass for consistency? Or clear at top? User wants Toss Style. Toss is clear at top, white/blur on scroll. But we are dark theme. Let's start clear, blur on scroll. Or just always blur if content goes under.*/}`}>
            <div className={styles.container}>
                <Link href="/" aria-label="Home">
                    <Image
                        src="/logo_header.png"
                        alt="SuperfastSAT"
                        width={200}
                        height={40}
                        className={styles.logoImage}
                        priority
                    />
                </Link>

                <nav className={styles.nav}>
                    <Link href="/blog?category=SAT%20RW" className={styles.menuItem}>
                        SAT RW팁
                    </Link>
                    <Link href="/blog?category=SAT%20Math" className={styles.menuItem}>
                        SAT Math팁
                    </Link>
                    <Link href="/blog?category=입시뉴스" className={styles.menuItem}>
                        입시뉴스
                    </Link>
                    <Link href="/reviews" className={styles.menuItem}>
                        수업 후기
                    </Link>
                    <Link href="/diagnosis" className={styles.menuItem}>
                        진단테스트
                    </Link>
                    <Link
                        href="https://www.superfastsat.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.menuItem}
                    >
                        SAT인강
                    </Link>
                </nav>
            </div>
            <LiveStatus />
        </header>
    );
}
