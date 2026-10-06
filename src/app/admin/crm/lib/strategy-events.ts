'use client';

// 학생 패널에서 전략 기록(strategy_history)을 바꾸면, 같은 화면의 세일즈 전략 통계가 다시 불러오도록 알린다.
// 통계는 서버가 strategy_history로 매번 계산하므로 다시 불러오기만 하면 반영된다.
import { useEffect, useRef } from 'react';

const EVENT = 'crm:strategy-history-changed';

export function notifyStrategyHistoryChanged(studentId: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: studentId }));
}

export function useOnStrategyHistoryChanged(cb: (studentId: string) => void) {
  const ref = useRef(cb);
  useEffect(() => { ref.current = cb; }, [cb]);
  useEffect(() => {
    const handler = (e: Event) => ref.current((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
}
