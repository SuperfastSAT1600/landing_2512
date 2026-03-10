'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import styles from './Header.module.css';
import LiveStatus from './LiveStatus';

const NAV_ITEMS = [
    { href: '/blog?category=SAT%20RW', label: 'SAT RW팁' },
    { href: '/blog?category=SAT%20Math', label: 'SAT Math팁' },
    { href: '/blog?category=입시뉴스', label: '입시뉴스' },
    { href: '/reviews', label: '수업 후기' },
    { href: '/diagnosis', label: '진단테스트' },
    { href: 'https://www.superfastsat.com', label: 'SAT인강', external: true },
] as const;

function NavLinks() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isActive = (href: string) => {
        if (href.startsWith('http')) return false;
        const [path, query] = href.split('?');
        if (path !== pathname) return false;
        if (!query) return true;
        const params = new URLSearchParams(query);
        for (const [key, value] of params.entries()) {
            if (searchParams.get(key) !== decodeURIComponent(value)) return false;
        }
        return true;
    };

    return (
        <nav className={styles.nav}>
            {NAV_ITEMS.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    {...('external' in item && item.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                    className={`${styles.menuItem} ${isActive(item.href) ? styles.active : ''}`}
                >
                    {item.label}
                </Link>
            ))}
        </nav>
    );
}

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

    if (pathname?.startsWith('/admin')) return null;
    if (pathname?.startsWith('/reports')) return null;

    return (
        <header className={`${styles.header} ${scrolled ? styles.glass : ''}`}>
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
                <Suspense fallback={<nav className={styles.nav} />}>
                    <NavLinks />
                </Suspense>
            </div>
            <LiveStatus />
        </header>
    );
}
