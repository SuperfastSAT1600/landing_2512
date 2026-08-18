import { useEffect, useState } from 'react';

/**
 * SSR-safe media-query hook. Returns true when the viewport is below the
 * given max-width (default 767px = Tailwind `md` breakpoint).
 *
 * Initialized to `false` so server render and first client paint match
 * (avoids hydration mismatch); the real value is applied in an effect.
 */
export function useIsMobile(maxWidth = 767): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [maxWidth]);

  return isMobile;
}
