'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Student } from '@/types/crm';

/** 리드풀 검색 — 입력 300ms 디바운스, 이미 이 전략에 있는 학생은 결과에서 제외. */
export function useRetryLeadSearch(adminKey: string, students: Student[]) {
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searchingLeads, setSearchingLeads] = useState(false);

  const handleLeadSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearchingLeads(true);
    const res = await fetch(`/api/crm/students?pool=true&search=${encodeURIComponent(query)}`, {
      headers: { 'x-admin-key': adminKey },
    });
    const json = await res.json();
    // 이미 이 전략에 있는 학생 제외
    const existingIds = new Set(students.map(s => s.id));
    setSearchResults((json.data ?? []).filter((s: Student) => !existingIds.has(s.id)));
    setSearchingLeads(false);
  }, [adminKey, students]);

  useEffect(() => {
    const t = setTimeout(() => handleLeadSearch(leadSearch), 300);
    return () => clearTimeout(t);
  }, [leadSearch, handleLeadSearch]);

  return {
    showAddLead,
    setShowAddLead,
    leadSearch,
    setLeadSearch,
    searchResults,
    setSearchResults,
    searchingLeads,
  };
}
