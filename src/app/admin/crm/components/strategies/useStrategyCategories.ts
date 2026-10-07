'use client';

import { useEffect, useState } from 'react';
import type { StrategyCategory } from '@/types/crm';

/** 세그먼트별 전략 라이브러리 카테고리 CRUD (146). */
export function useStrategyCategories(segment: 'b2c' | 'b2b', adminKey: string) {
  const [categories, setCategories] = useState<StrategyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const headers = { 'x-admin-key': adminKey, 'Content-Type': 'application/json' };

  useEffect(() => {
    let alive = true;
    fetch(`/api/crm/strategy-categories?segment=${segment}`, { headers: { 'x-admin-key': adminKey } })
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        setCategories(json.data ?? []);
        setLoading(false);
      })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [segment, adminKey]);

  async function create(name: string) {
    const res = await fetch('/api/crm/strategy-categories', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, segment }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    setCategories((prev) => [...prev, json.data]);
    return json.data as StrategyCategory;
  }

  async function rename(id: string, name: string) {
    const res = await fetch(`/api/crm/strategy-categories/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return false;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    return true;
  }

  async function remove(id: string) {
    const res = await fetch(`/api/crm/strategy-categories/${id}`, { method: 'DELETE', headers });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      alert(json?.error ?? '카테고리 삭제에 실패했습니다.');
      return false;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    return true;
  }

  async function reorder(orderedIds: string[]) {
    setCategories((prev) =>
      [...prev].sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id))
    );
    await fetch('/api/crm/strategy-categories/reorder', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ segment, ordered_ids: orderedIds }),
    });
  }

  return { categories, loading, create, rename, remove, reorder };
}
