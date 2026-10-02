'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Student, RetryStrategy } from '@/types/crm';
import { resolveDefaultCategoryId } from '../strategies/resolveDefaultCategoryId';
import {
  groupStrategiesByCategory,
  groupStudentsByStage,
  type RetryCategory,
} from './retry-board-utils';
import { useRetryDrag } from './useRetryDrag';
import { useRetryLeadSearch } from './useRetryLeadSearch';

export interface UseRetryBoardOptions {
  adminKey: string;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
  onStrategyChange?: (ctx: { id: string; name: string } | null) => void;
  enrolledStudentId?: string | null;
  onEnrolledHandled?: () => void;
}

/** 재시도 보드의 데이터 소유자 — 전략 목록·선택 전략의 학생·전략/리드 변경과 드래그. */
export function useRetryBoard({
  adminKey,
  onStudentUpdate,
  onStrategyChange,
  enrolledStudentId,
  onEnrolledHandled,
}: UseRetryBoardOptions) {
  const [strategies, setStrategies] = useState<RetryStrategy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (enrolledStudentId) {
      setStudents(prev => prev.filter(s => s.id !== enrolledStudentId));
      onEnrolledHandled?.();
    }
  }, [enrolledStudentId, onEnrolledHandled]);
  const [newStrategyName, setNewStrategyName] = useState('');
  const [creatingStrategy, setCreatingStrategy] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  const headers = useMemo(
    () => ({ 'x-admin-key': adminKey, 'Content-Type': 'application/json' }),
    [adminKey]
  );

  const [categories, setCategories] = useState<RetryCategory[]>([]);
  const [retryCategoryId, setRetryCategoryId] = useState<string | null>(null);

  // kind 축이 없어졌으므로 세그먼트 전체 전략을 불러와 카테고리로 묶어 보여준다.
  const fetchStrategies = useCallback(async () => {
    const res = await fetch('/api/crm/retry-strategies?segment=b2c', { headers: { 'x-admin-key': adminKey } });
    const json = await res.json();
    setStrategies(json.data ?? []);
  }, [adminKey]);

  // 새 전략 생성 시 넣을 기본 카테고리를 조회해둔다. 이름 매칭이 아니라
  // sort_order가 가장 낮은 카테고리를 쓴다 — 카테고리 이름이 바뀌거나 특정
  // 카테고리가 삭제돼도 깨지지 않는다 (146).
  const fetchRetryCategoryId = useCallback(async () => {
    const res = await fetch('/api/crm/strategy-categories?segment=b2c', { headers: { 'x-admin-key': adminKey } });
    const json = await res.json();
    setCategories(json.data ?? []);
    setRetryCategoryId(resolveDefaultCategoryId(json.data ?? []));
  }, [adminKey]);

  useEffect(() => {
    fetchStrategies();
    fetchRetryCategoryId();
  }, [fetchStrategies, fetchRetryCategoryId]);

  const fetchStudents = useCallback(async (strategyId: string) => {
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/crm/students?retry_strategy_id=${strategyId}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      setStudents(json.data ?? []);
    } finally {
      setLoadingStudents(false);
    }
  }, [adminKey]);

  useEffect(() => {
    if (selectedId) {
      fetchStudents(selectedId);
    } else {
      setStudents([]);
    }
  }, [selectedId, fetchStudents]);

  useEffect(() => {
    if (!onStrategyChange) return;
    const strategy = strategies.find(s => s.id === selectedId);
    onStrategyChange(strategy ? { id: strategy.id, name: strategy.name } : null);
  }, [selectedId, strategies, onStrategyChange]);

  const handleCreateStrategy = async () => {
    if (!newStrategyName.trim() || !retryCategoryId) return;
    const res = await fetch('/api/crm/retry-strategies', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: newStrategyName.trim(), category_id: retryCategoryId, segment: 'b2c' }),
    });
    if (res.ok) {
      const json = await res.json();
      setStrategies(prev => [...prev, json.data]);
      setSelectedId(json.data.id);
      setNewStrategyName('');
      setCreatingStrategy(false);
    } else {
      alert('전략 생성에 실패했습니다.');
    }
  };

  const handleDeleteStrategy = async (id: string) => {
    if (!confirm('이 전략을 삭제하면 포함된 학생들은 리드풀로 돌아갑니다. 계속할까요?')) return;
    const res = await fetch(`/api/crm/retry-strategies/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      setStrategies(prev => prev.filter(s => s.id !== id));
      if (selectedId === id) setSelectedId(null);
    } else {
      alert('삭제에 실패했습니다.');
    }
  };

  const saveDescription = async () => {
    const res = await fetch(`/api/crm/retry-strategies/${selectedId}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ description: descDraft }),
    });
    if (res.ok) {
      const json = await res.json();
      setStrategies(prev => prev.map(s => s.id === selectedId ? json.data : s));
    }
    setEditingDesc(false);
  };

  const search = useRetryLeadSearch(adminKey, students);
  const { setSearchResults } = search;

  const handleAddLead = async (student: Student) => {
    const res = await fetch(`/api/crm/retry-strategies/${selectedId}/students`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ student_id: student.id }),
    });
    if (res.ok) {
      const json = await res.json();
      setStudents(prev => [...prev, json.data]);
      setSearchResults(prev => prev.filter(s => s.id !== student.id));
    } else {
      alert('학생 추가에 실패했습니다.');
    }
  };

  const handleRemoveLead = useCallback(async (student: Student) => {
    if (!confirm(`${student.name}을(를) 이 전략에서 제거할까요?`)) return;
    const res = await fetch(`/api/crm/students/${student.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ retry_strategy_id: null, retry_stage: null, retry_assigned_at: null }),
    });
    if (res.ok) {
      setStudents(prev => prev.filter(s => s.id !== student.id));
    }
  }, [headers]);

  const drag = useRetryDrag({ students, setStudents, headers, onStudentUpdate });

  const studentsByStage = useMemo(() => groupStudentsByStage(students), [students]);
  const strategyGroups = useMemo(
    () => groupStrategiesByCategory(categories, strategies),
    [categories, strategies]
  );

  return {
    strategies,
    strategyGroups,
    selectedId,
    setSelectedId,
    studentsByStage,
    loadingStudents,
    retryCategoryId,
    newStrategyName,
    setNewStrategyName,
    creatingStrategy,
    setCreatingStrategy,
    editingDesc,
    setEditingDesc,
    descDraft,
    setDescDraft,
    handleCreateStrategy,
    handleDeleteStrategy,
    saveDescription,
    handleAddLead,
    handleRemoveLead,
    search,
    drag,
  };
}
