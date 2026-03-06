'use client';

import React, { useEffect, useRef } from 'react';

interface MathRendererProps {
  children: string;
  className?: string;
  displayMode?: boolean;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MathJax: any;
  }
}

let mathJaxLoadingPromise: Promise<void> | null = null;
let mathJaxLoaded = false;

function loadMathJax(): Promise<void> {
  if (mathJaxLoadingPromise) return mathJaxLoadingPromise;
  if (mathJaxLoaded && window.MathJax?.typesetPromise) return Promise.resolve();

  mathJaxLoadingPromise = new Promise<void>((resolve, reject) => {
    if (window.MathJax?.typesetPromise) {
      mathJaxLoaded = true;
      resolve();
      return;
    }

    window.MathJax = {
      tex: {
        inlineMath: [['\\(', '\\)']],
        displayMath: [['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true,
        packages: { '[+]': ['ams', 'color', 'bbox'] },
      },
      svg: { fontCache: 'global', scale: 1 },
      chtml: { scale: 1 },
      startup: {
        ready() {
          window.MathJax.startup.defaultReady();
          mathJaxLoaded = true;
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
    script.onerror = () => {
      mathJaxLoadingPromise = null;
      reject(new Error('Failed to load MathJax'));
    };
    document.head.appendChild(script);
  });

  return mathJaxLoadingPromise;
}

async function waitForMathJax(maxAttempts = 100, delay = 50): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (window.MathJax?.typesetPromise && typeof window.MathJax.typesetPromise === 'function') {
      if (window.MathJax.startup?.promise) {
        try {
          await window.MathJax.startup.promise;
        } catch {
          // non-critical
        }
      }
      return;
    }
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('MathJax initialization timeout');
}

export function MathRenderer({ children, className = '', displayMode = false }: MathRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [renderError, setRenderError] = React.useState(false);

  useEffect(() => {
    const renderMath = async () => {
      if (!containerRef.current) return;
      try {
        setRenderError(false);
        await loadMathJax();
        await waitForMathJax();

        const openDelim = displayMode ? '\\[' : '\\(';
        const closeDelim = displayMode ? '\\]' : '\\)';
        containerRef.current.innerHTML = `${openDelim}${children}${closeDelim}`;
        await window.MathJax.typesetPromise([containerRef.current]);
      } catch {
        setRenderError(true);
        if (containerRef.current) {
          const openDelim = displayMode ? '\\[' : '\\(';
          const closeDelim = displayMode ? '\\]' : '\\)';
          containerRef.current.innerHTML = `<span class="font-mono text-red-600 text-xs">${openDelim}${children}${closeDelim}</span>`;
        }
      }
    };
    renderMath();
  }, [children, displayMode]);

  return (
    <span
      ref={containerRef}
      className={className}
      style={{
        display: displayMode ? 'block' : 'inline-block',
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
      }}
    />
  );
}
