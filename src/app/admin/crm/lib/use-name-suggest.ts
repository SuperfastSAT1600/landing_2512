'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 300;
const MIN_LENGTH = 2;

/**
 * 이름 입력 중 동명이인 후보를 보여주기 위한 자동완성.
 * excludeId: 편집 중인 학생 자신은 후보에서 뺀다.
 */
export function useNameSuggest(adminKey: string, excludeId?: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const search = useCallback((value: string) => {
    if (timer.current) clearTimeout(timer.current);
    const q = value.trim();
    if (!adminKey || q.length < MIN_LENGTH) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/crm/students?name_search=${encodeURIComponent(q)}`, {
          headers: { 'x-admin-key': adminKey },
        });
        const json = await res.json();
        const rows: { id: string; name: string }[] = json.data ?? [];
        setSuggestions(rows.filter((s) => s.id !== excludeId).map((s) => s.name));
      } catch (e) {
        // 자동완성은 보조 기능이라 실패해도 입력을 막지 않는다.
        console.error('[useNameSuggest]', e);
      }
    }, DEBOUNCE_MS);
  }, [adminKey, excludeId]);

  const clear = useCallback(() => setSuggestions([]), []);

  return { suggestions, search, clear };
}
