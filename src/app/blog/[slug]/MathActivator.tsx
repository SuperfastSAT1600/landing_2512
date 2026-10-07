'use client';

import { useEffect } from 'react';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface Window { MathJax: any; }
}

let mjPromise: Promise<void> | null = null;

function ensureMathJax(): Promise<void> {
    if (mjPromise) return mjPromise;
    if (typeof window !== 'undefined' && window.MathJax?.typesetPromise) return Promise.resolve();

    mjPromise = new Promise<void>((resolve, reject) => {
        if (window.MathJax?.typesetPromise) { resolve(); return; }

        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
            },
            svg: { fontCache: 'global' },
            startup: {
                ready() {
                    window.MathJax.startup.defaultReady();
                    resolve();
                },
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
                enableMenu: false,
            },
        };

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
        script.async = true;
        script.onerror = () => { mjPromise = null; reject(new Error('MathJax load failed')); };
        document.head.appendChild(script);
    });

    return mjPromise;
}

export function MathActivator() {
    useEffect(() => {
        const prose = document.querySelector('.prose');
        if (!prose) return;

        let cancelled = false;
        (async () => {
            try {
                await ensureMathJax();
                if (cancelled) return;
                for (let i = 0; i < 80; i++) {
                    if (window.MathJax?.typesetPromise) break;
                    await new Promise(r => setTimeout(r, 50));
                }
                if (cancelled) return;
                await window.MathJax.typesetPromise([prose]);
            } catch {
                // leave raw math on failure
            }
        })();

        return () => { cancelled = true; };
    }, []);

    return null;
}
