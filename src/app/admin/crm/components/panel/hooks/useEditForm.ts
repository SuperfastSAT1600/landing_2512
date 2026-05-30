'use client';

import { useState } from 'react';
import type { Student } from '@/types/crm';
import type { EditForm } from '../types';
import { studentToEditForm } from '../types';

interface Params {
  studentId: string;
  adminKey: string;
  localStudent: Student;
  setLocalStudent: (updater: (prev: Student) => Student) => void;
  editForm: EditForm;
  setEditForm: (f: EditForm) => void;
  onUpdate: (id: string, updates: Partial<Student>) => void;
}

export function useEditForm({ studentId, adminKey, localStudent, setLocalStudent, editForm, setEditForm, onUpdate }: Params) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingInquiry, setIsEditingInquiry] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingInquiry, setSavingInquiry] = useState(false);
  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  async function handleSaveEdit() {
    setSavingEdit(true);
    try {
      const updates: Partial<Student> = {
        name: editForm.name.trim(), portal_name: editForm.portal_name.trim() || null, grade: editForm.grade,
        school_type: editForm.school_type as Student['school_type'],
        contact_type: editForm.contact_type as Student['contact_type'],
        parent_phone: editForm.parent_phone.trim(),
        parent_timezone: editForm.parent_timezone || null,
        desired_subjects: editForm.desired_subjects as Student['desired_subjects'],
        previous_score_status: editForm.previous_score_status as Student['previous_score_status'],
        previous_test_date: editForm.previous_score_status === 'scored' ? (editForm.previous_test_date || null) : null,
        previous_rw_score: editForm.previous_rw_score ? parseInt(editForm.previous_rw_score) : null,
        previous_math_score: editForm.previous_math_score ? parseInt(editForm.previous_math_score) : null,
        target_score: editForm.target_score ? parseInt(editForm.target_score) : null,
        target_score_2: editForm.target_score_2 ? parseInt(editForm.target_score_2) : null,
        target_test_date: editForm.target_test_date || null,
        target_test_date_2: editForm.target_test_date_2 || null,
        preferred_language: (editForm.preferred_language as Student['preferred_language']) || null,
      };
      const res = await fetch(`/api/crm/students/${studentId}`, {
        method: 'PATCH', headers, body: JSON.stringify(updates),
      });
      if (res.ok) {
        setLocalStudent(prev => ({ ...prev, ...updates }));
        onUpdate(studentId, updates);
        setIsEditing(false);
      } else {
        const json = await res.json();
        alert(json.error?.message ?? '저장에 실패했습니다.');
      }
    } finally {
      setSavingEdit(false);
    }
  }

  function handleCancelEdit() {
    setEditForm(studentToEditForm(localStudent));
    setIsEditing(false);
  }

  async function handleSaveInquiry() {
    setSavingInquiry(true);
    try {
      const updates: Partial<Student> = {
        inquiry_date: editForm.inquiry_date || null,
        inquiry_channel: (editForm.inquiry_channel as Student['inquiry_channel']) || null,
        traffic_source: (editForm.traffic_source as Student['traffic_source']) || null,
        content_author: (editForm.content_author as Student['content_author']) || null,
        lead_type: editForm.lead_type as Student['lead_type'],
        b2b_partner: editForm.lead_type === 'B2B' && editForm.b2b_partner
          ? editForm.b2b_partner as Student['b2b_partner'] : null,
      };
      const res = await fetch(`/api/crm/students/${studentId}`, {
        method: 'PATCH', headers, body: JSON.stringify(updates),
      });
      if (res.ok) {
        setLocalStudent(prev => ({ ...prev, ...updates }));
        onUpdate(studentId, updates);
        setIsEditingInquiry(false);
      } else {
        const json = await res.json();
        alert(json.error?.message ?? '저장에 실패했습니다.');
      }
    } finally {
      setSavingInquiry(false);
    }
  }

  function handleCancelInquiry() {
    setEditForm(studentToEditForm(localStudent));
    setIsEditingInquiry(false);
  }

  return {
    isEditing, setIsEditing,
    isEditingInquiry, setIsEditingInquiry,
    savingEdit, savingInquiry,
    handleSaveEdit, handleCancelEdit,
    handleSaveInquiry, handleCancelInquiry,
  };
}
