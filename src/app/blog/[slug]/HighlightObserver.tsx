'use client';

import { useEffect } from 'react';

export function HighlightObserver() {
    useEffect(() => {
        const marks = Array.from(document.querySelectorAll<HTMLElement>('mark'));
        if (!marks.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        (entry.target as HTMLElement).dataset.hl = '1';
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.6 }
        );

        marks.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return null;
}
