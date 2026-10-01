'use client';

import { useState, useEffect, useRef } from 'react';
import type { Student, ConsultationEntry } from '@/types/crm';
import { studentToEditForm } from '../types';
import type { EditForm } from '../types';

/**
 * 상세 패널의 학생 데이터를 열릴 때마다 최신화한다.
 * 404(이미 삭제된 리드)면 stale 데이터를 그대로 두지 않고 onMissing으로 알린다 —
 * 유령 패널에서 저장을 시도하면 PATCH가 0행이 되어 DB 오류로 이어지기 때문이다.
 */
export function usePanelData(
  studentId: string,
  adminKey: string,
  initialStudent: Student,
  onMissing?: () => void
) {
  const [localStudent, setLocalStudent] = useState<Student>(initialStudent);
  const [timeline, setTimeline] = useState<ConsultationEntry[]>(initialStudent.consultation_timeline ?? []);
  const [editForm, setEditForm] = useState<EditForm>(studentToEditForm(initialStudent));
  const [loadingFresh, setLoadingFresh] = useState(true);
  const onMissingRef = useRef(onMissing);

  useEffect(() => {
    onMissingRef.current = onMissing;
  }, [onMissing]);

  useEffect(() => {
    let cancelled = false;
    async function fetchFresh() {
      try {
        const res = await fetch(`/api/crm/students/${studentId}`, {
          headers: { 'x-admin-key': adminKey },
        });
        if (cancelled) return;
        if (res.status === 404) {
          onMissingRef.current?.();
          return;
        }
        const json = await res.json();
        if (!cancelled && res.ok && json.data) {
          setLocalStudent(json.data);
          setTimeline(json.data.consultation_timeline ?? []);
          setEditForm(studentToEditForm(json.data));
        }
      } catch {
        // 네트워크 오류는 패널을 닫을 근거가 아니다 — 기존 데이터를 유지한다.
      } finally {
        if (!cancelled) setLoadingFresh(false);
      }
    }
    fetchFresh();
    return () => { cancelled = true; };
  }, [studentId, adminKey]);

  return { localStudent, setLocalStudent, timeline, setTimeline, editForm, setEditForm, loadingFresh };
}
