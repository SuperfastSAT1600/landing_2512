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

const COUNTDOWN_SEC = 5;

export function ReadCompletePopup({ fixedPost, relatedPosts, sentinelId }: Props) {
  const relatedPost: PostSummary | null = fixedPost ?? (
    relatedPosts.length > 0
      ? relatedPosts[Math.floor(Math.random() * relatedPosts.length)]
      : null
  );
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [remaining, setRemaining] = useState(COUNTDOWN_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const goToPost = useCallback(() => {
    if (relatedPost) router.push(`/blog/${relatedPost.id}`);
  }, [router, relatedPost]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setVisible(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !dismissed) setVisible(true);
      },
      { threshold: 0.5 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelId, dismissed]);

  useEffect(() => {
    if (!visible) return;

    setRemaining(COUNTDOWN_SEC);
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          goToPost();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, goToPost]);

  if (!visible || !relatedPost) return null;

  const progress = ((COUNTDOWN_SEC - remaining) / COUNTDOWN_SEC) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Positioning wrapper — transform only, no animation */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
        {/* Animated card */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="관련 글 추천"
          className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
        >
          {/* Thumbnail */}
          {relatedPost.featuredImage ? (
            <div className="relative w-full aspect-video">
              <Image
                src={relatedPost.featuredImage}
                alt={relatedPost.title}
                fill
                unoptimized
                className="object-cover"
                sizes="384px"
              />
            </div>
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-blue-50 to-indigo-100" />
          )}

          <div className="px-6 pt-5 pb-6">
            {/* Progress bar */}
            <div className="h-1 bg-gray-100 rounded-full mb-5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Content */}
            <p className="text-sm text-gray-500 mb-1">이 글도 도움이 되실 거예요</p>
            <p className="text-base font-bold text-gray-900 leading-snug mb-4 line-clamp-2">
              {relatedPost.title}
            </p>

            {/* Countdown hint */}
            <p className="text-xs text-gray-400 mb-4 text-center">
              잠시 후 다음 글로 넘어가요 ({remaining}초)
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={dismiss}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={goToPost}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                지금 읽기
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
