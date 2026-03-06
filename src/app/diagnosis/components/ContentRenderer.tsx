'use client';

import React, { useEffect, useRef } from 'react';
import { MathRenderer } from './MathRenderer';

interface ContentRendererProps {
  content: string;
  className?: string;
}

export function ContentRenderer({ content, className = '' }: ContentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const images = containerRef.current.querySelectorAll('img');
    const handleImageError = (event: Event) => {
      const img = event.target as HTMLImageElement;
      if (img.src.startsWith('blob:')) {
        img.style.display = 'none';
      }
    };
    images.forEach(img => img.addEventListener('error', handleImageError));
    return () => images.forEach(img => img.removeEventListener('error', handleImageError));
  }, [content]);

  if (!content || content.trim() === '') return null;

  const processContent = (text: string): React.ReactNode[] => {
    const mathRegex = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mathRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const htmlPart = text.slice(lastIndex, match.index);
        if (htmlPart) {
          parts.push(
            <span key={`html-${lastIndex}`} dangerouslySetInnerHTML={{ __html: htmlPart }} />
          );
        }
      }
      const mathContent = match[1] ?? match[2];
      const isDisplay = !!match[1];
      if (mathContent) {
        parts.push(
          <MathRenderer key={`math-${match.index}`} displayMode={isDisplay}>
            {mathContent}
          </MathRenderer>
        );
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      const htmlPart = text.slice(lastIndex);
      if (htmlPart) {
        parts.push(
          <span key={`html-${lastIndex}`} dangerouslySetInnerHTML={{ __html: htmlPart }} />
        );
      }
    }

    return parts.length > 0 ? parts : [
      <span key="fallback" dangerouslySetInnerHTML={{ __html: text }} />,
    ];
  };

  return (
    <div
      ref={containerRef}
      className={`content-renderer ${className}`}
      style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}
    >
      {processContent(content)}
    </div>
  );
}
