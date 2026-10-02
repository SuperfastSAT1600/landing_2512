'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Student } from '@/types/crm';

/** 리드풀 학생 목록 + 통계 카운트 + 이름 검색(디바운스) 로딩. */
export function useLeadPoolData(adminKey: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolError, setPoolError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const [statsInactive, setStatsInactive] = useState<number | null>(null);
  const [statsReactivating, setStatsReactivating] = useState<number | null>(null);
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchCounterRef = useRef(0);

  // 초기 로드: 카운트만 가져옴
  useEffect(() => {
    if (!adminKey) return;
    fetch('/api/crm/students?pool=true&stats_only=true', {
      headers: { 'x-admin-key': adminKey },
    })
      .then((r) => r.json())
      .then((json) => {
        setStatsInactive(json.data?.inactive ?? 0);
        setStatsReactivating(json.data?.reactivating ?? 0);
      })
      .catch((err) => console.error('[LeadPool] stats fetch failed:', err));
  }, [adminKey]);

  const fetchPoolStudents = useCallback(
    async (search: string) => {
      const requestId = ++fetchCounterRef.current;
      setPoolLoading(true);
      setPoolError(null);
      try {
        const res = await fetch(
          `/api/crm/students?pool=true&search=${encodeURIComponent(search)}`,
          { headers: { 'x-admin-key': adminKey } }
        );
        if (!res.ok) throw new Error('리드풀 데이터를 불러오지 못했습니다.');
        const data = await res.json();
        if (requestId !== fetchCounterRef.current) return;
        setStudents(data.data ?? []);
      } catch (err) {
        if (requestId !== fetchCounterRef.current) return;
        setPoolError(err instanceof Error ? err.message : '데이터 로드에 실패했습니다.');
      } finally {
        if (requestId === fetchCounterRef.current) setPoolLoading(false);
      }
    },
    [adminKey]
  );

  // 진입 시 전체 풀 로드 + 이름 검색 디바운스 (빈 검색 = 전체 목록)
  useEffect(() => {
    if (!adminKey) return;
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    const q = nameSearch.trim();
    nameDebounceRef.current = setTimeout(
      () => {
        setHasSearched(true);
        fetchPoolStudents(q); // 빈 문자열이면 전체 풀(inactive+reactivating) 반환
      },
      q ? 300 : 0
    );
    return () => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    };
  }, [nameSearch, fetchPoolStudents, adminKey]);

  return {
    students,
    setStudents,
    poolLoading,
    poolError,
    hasSearched,
    nameSearch,
    setNameSearch,
    statsInactive,
    statsReactivating,
    fetchPoolStudents,
  };
}
