'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { PostData } from '@/lib/posts';

type PostSummary = Pick<PostData, 'id' | 'title' | 'featuredImage'>;

interface Props {
  fixedPost: PostSummary | null;
  relatedPosts: PostSummary[];
  sentinelId: string;
}

// Must be on page for at least this long before popup can fire
const MIN_READ_TIME_MS = 60_000;
// Delay before observing sentinel — prevents false-fire on navigation scroll reset
const OBSERVE_DELAY_MS = 2000;

export function ReadCompletePopup({ fixedPost, relatedPosts, sentinelId }: Props) {
  const [relatedPost] = useState<PostSummary | null>(
    fixedPost ?? (relatedPosts.length > 0
      ? relatedPosts[Math.floor(Math.random() * relatedPosts.length)]
      : null)
  );
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const dismissedRef = useRef(false);
  const readStartRef = useRef(Date.now());
  const router = useRouter();

  const goToPost = useCallback(() => {
    if (relatedPost) router.push(`/blog/${relatedPost.id}`);
  }, [router, relatedPost]);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    setVisible(false);
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let waitId: ReturnType<typeof setTimeout> | undefined;
    const cancelWait = () => {
      clearTimeout(waitId);
      waitId = undefined;
    };

    const timeoutId = setTimeout(() => {
      const sentinel = document.getElementById(sentinelId);
      if (!sentinel || dismissedRef.current) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (dismissedRef.current) return;
          cancelWait();
          if (entry.isIntersecting) {
            // The observer only fires on change, so an early arrival must
            // schedule its own show instead of being dropped.
            const remaining = MIN_READ_TIME_MS - (Date.now() - readStartRef.current);
            if (remaining <= 0) {
              setVisible(true);
            } else {
              waitId = setTimeout(() => setVisible(true), remaining);
            }
          } else if (entry.boundingClientRect.top > 0) {
            // Sentinel is below the viewport (reader scrolled back up) — hide.
            // Scrolled past it (top < 0) keeps the popup up.
            setVisible(false);
          }
        },
        { threshold: 0.5 }
      );

      observerRef.current = observer;
      observer.observe(sentinel);
    }, OBSERVE_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
      cancelWait();
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [sentinelId]);

  if (!relatedPost) return null;

  return (
    <div
      role="complementary"
      aria-label="관련 글 추천"
      style={{ zIndex: 110 }}
      className={[
        'fixed bottom-0 left-0 right-0',
        'transition-transform duration-300 ease-out',
        visible ? 'translate-y-0' : 'translate-y-full',
      ].join(' ')}
    >
      <div className="border-t border-gray-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-[680px] mx-auto px-4 py-3 flex items-center gap-3">
          {/* Thumbnail */}
          {relatedPost.featuredImage && (
            <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-gray-100">
              <Image
                src={relatedPost.featuredImage}
                alt={relatedPost.title}
                fill
                unoptimized
                className="object-cover"
                sizes="56px"
              />
            </div>
          )}

          {/* Title */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">다음으로 읽어보세요</p>
            <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
              {relatedPost.title}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={dismiss}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
              aria-label="닫기"
            >
              닫기
            </button>
            <button
              onClick={goToPost}
              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-2 rounded-lg"
            >
              읽기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
