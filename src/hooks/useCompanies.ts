'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Company } from '@/types/crm';

/**
 * B2B 업체 목록 로더. 기본은 활성 업체만(드롭다운용). all=true면 비활성 포함(관리 화면용).
 * refetch로 CRUD 후 갱신.
 */
export function useCompanies(adminKey: string, opts?: { all?: boolean }) {
  const all = opts?.all ?? false;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError('');
    try {
      const qs = all ? '' : '?active=true';
      const res = await fetch(`/api/crm/companies${qs}`, { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      if (res.ok) setCompanies(json.data ?? []);
      else setError(json.error ?? '업체 목록을 불러오지 못했습니다.');
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [adminKey, all]);

  useEffect(() => { refetch(); }, [refetch]);

  return { companies, loading, error, refetch };
}
