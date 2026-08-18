'use client';

import { useState, useEffect } from 'react';
import type { Student, ConsultationEntry } from '@/types/crm';
import { studentToEditForm } from '../types';
import type { EditForm } from '../types';

export function usePanelData(studentId: string, adminKey: string, initialStudent: Student) {
  const [localStudent, setLocalStudent] = useState<Student>(initialStudent);
  const [timeline, setTimeline] = useState<ConsultationEntry[]>(initialStudent.consultation_timeline ?? []);
  const [editForm, setEditForm] = useState<EditForm>(studentToEditForm(initialStudent));
  const [loadingFresh, setLoadingFresh] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchFresh() {
      try {
        const res = await fetch(`/api/crm/students/${studentId}`, {
          headers: { 'x-admin-key': adminKey },
        });
        const json = await res.json();
        if (!cancelled && res.ok && json.data) {
          setLocalStudent(json.data);
          setTimeline(json.data.consultation_timeline ?? []);
          setEditForm(studentToEditForm(json.data));
        }
      } finally {
        if (!cancelled) setLoadingFresh(false);
      }
    }
    fetchFresh();
    return () => { cancelled = true; };
  }, [studentId, adminKey]);

  return { localStudent, setLocalStudent, timeline, setTimeline, editForm, setEditForm, loadingFresh };
}
