'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { ContentRenderer } from './ContentRenderer';
import { SavedWord } from '@/types/diagnosis';

interface SelectableTextProps {
  content: string;
  questionId: string;
  section: 'passage' | 'option' | 'question';
  optionId?: string | null;
  savedWords: SavedWord[];
  onWordClick: (word: SavedWord, position: { top: number; left: number }) => void;
  className?: string;
}

/**
 * Component that renders text content with word-level clickability
 * Words can be selected and saved for vocabulary tracking
 */
export function SelectableText({
  content,
  questionId,
  section,
  optionId,
  savedWords,
  onWordClick,
  className = '',
}: SelectableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordSpansRef = useRef<Map<string, HTMLSpanElement>>(new Map());

  // Check if a word is saved
  const isWordSaved = useCallback(
    (word: string, positionIndex: number): boolean => {
      return savedWords.some(
        (w) =>
          w.word === word &&
          w.questionId === questionId &&
          w.positionIndex === positionIndex &&
          w.section === section &&
          w.optionId === (optionId || null)
      );
    },
    [savedWords, questionId, section, optionId]
  );

  // Make words clickable after content is rendered
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous word spans
    wordSpansRef.current.clear();

    // Function to walk DOM and wrap words
    const wrapWords = (node: Node, wordIndex: { current: number }) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (!text.trim()) return; // Skip whitespace-only nodes

        // Split text into words and whitespace
        const parts = text.split(/(\s+)/);
        const fragment = document.createDocumentFragment();

        parts.forEach((part) => {
          if (!part) return;

          if (/^\s+$/.test(part)) {
            // Whitespace - add as-is
            fragment.appendChild(document.createTextNode(part));
          } else {
            // Word - wrap in span
            const span = document.createElement('span');
            span.textContent = part;
            span.style.cursor = 'pointer';
            span.className = `vocab-word-span`;

            const currentIndex = wordIndex.current;
            const trimmedWord = part.toLowerCase().trim();

            // Check if word is saved and apply styling
            if (isWordSaved(trimmedWord, currentIndex)) {
              span.classList.add('vocab-saved');
            }

            // Add click handler
            span.addEventListener('click', (e) => {
              const rect = span.getBoundingClientRect();
              onWordClick(
                {
                  word: trimmedWord,
                  questionId,
                  section,
                  optionId: optionId || null,
                  positionIndex: currentIndex,
                },
                { top: rect.top, left: rect.left }
              );
            });

            wordSpansRef.current.set(`${currentIndex}-${trimmedWord}`, span);
            fragment.appendChild(span);
            wordIndex.current++;
          }
        });

        node.parentNode?.replaceChild(fragment, node);
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        !(node as Element).classList.contains('katex') &&
        !(node as Element).classList.contains('katex-display')
      ) {
        // Recursively process child nodes (skip KaTeX elements)
        const children = Array.from(node.childNodes);
        children.forEach((child) => wrapWords(child, wordIndex));
      }
    };

    const wordIndex = { current: 0 };
    wrapWords(containerRef.current, wordIndex);

    return () => {
      // Cleanup is handled by React's DOM cleanup
      wordSpansRef.current.clear();
    };
  }, [content, questionId, section, optionId, isWordSaved, onWordClick]);

  return (
    <div
      ref={containerRef}
      className={`selectable-text ${className}`}
      style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}
    >
      <ContentRenderer content={content} />
    </div>
  );
}
