'use client';

import { useEffect, useRef } from 'react';

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
        inlineMath: [['\\(', '\\)']],
        displayMath: [['\\[', '\\]']],
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
    script.onerror = () => { mjPromise = null; reject(); };
    document.head.appendChild(script);
  });

  return mjPromise;
}

interface MathHtmlBlockProps {
  html: string;
  className?: string;
}

export function MathHtmlBlock({ html, className = '' }: MathHtmlBlockProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;

    ref.current.innerHTML = html;

    (async () => {
      try {
        await ensureMathJax();
        if (cancelled || !ref.current) return;
        // wait until typesetPromise is ready
        for (let i = 0; i < 80; i++) {
          if (window.MathJax?.typesetPromise) break;
          await new Promise(r => setTimeout(r, 50));
        }
        if (cancelled || !ref.current) return;
        await window.MathJax.typesetPromise([ref.current]);
      } catch {
        // leave raw HTML on failure
      }
    })();

    return () => { cancelled = true; };
  }, [html]);

  return <div ref={ref} className={className} />;
}
