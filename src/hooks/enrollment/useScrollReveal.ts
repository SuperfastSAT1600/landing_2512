import { useCallback, useRef } from 'react';

export function useScrollReveal(threshold = 0.1) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add('is-visible');
            observer.disconnect();
          }
        },
        { threshold }
      );
      observer.observe(el);
      observerRef.current = observer;
    },
    [threshold]
  );

  return ref;
}
