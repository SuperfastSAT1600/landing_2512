'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * 현재 시각(ms, intervalMs 단위로 내림). 서버 렌더와 일치하도록 서버 스냅샷은 null이고,
 * 마운트 후 intervalMs마다 갱신된다.
 */
export function useNow(intervalMs = 15_000): number | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const id = setInterval(onChange, intervalMs);
      return () => clearInterval(id);
    },
    [intervalMs],
  );
  return useSyncExternalStore<number | null>(subscribe, () => Math.floor(Date.now() / intervalMs) * intervalMs, () => null);
}
