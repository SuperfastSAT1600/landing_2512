'use client';

import { useState } from 'react';
import type { Student, FunnelStage, LeadStatus, ChurnType } from '@/types/crm';

interface Params {
  studentId: string;
  adminKey: string;
  setLocalStudent: (updater: (prev: Student) => Student) => void;
  onUpdate: (id: string, updates: Partial<Student>) => void;
}

export function useFunnel({ studentId, adminKey, setLocalStudent, onUpdate }: Params) {
  const [funnelChanging, setFunnelChanging] = useState(false);
  const [showFunnelMenu, setShowFunnelMenu] = useState(false);
  const [showChurnModal, setShowChurnModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReactivateForm, setShowReactivateForm] = useState(false);
  const [reactivateStrategy, setReactivateStrategy] = useState('');
  const [reactivating, setReactivating] = useState(false);
  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  async function handleFunnelChange(newStage: FunnelStage) {
    setFunnelChanging(true);
    try {
      // 정상(비-이탈) 단계로 옮기는 건 메인 퍼널에서 작업한다는 뜻 → 활성 리드로 전환하고
      // 재시도 전략 배정을 해제한다. 재시도/재활성화 리드를 퍼널로 옮겨도 최초세일즈 칸반에
      // 보이도록(칸반은 !retry_strategy_id + lead_status==='active'로 필터). active·retry 없는
      // 리드엔 무영향(idempotent). 'churned'(이탈)는 별도 모달이 처리하므로 단계만 변경.
      const updates: Partial<Student> =
        newStage === 'churned'
          ? { funnel_stage: newStage }
          : { funnel_stage: newStage, lead_status: 'active', retry_strategy_id: null, retry_stage: null, retry_assigned_at: null };
      const res = await fetch(`/api/crm/students/${studentId}`, {
        method: 'PATCH', headers, body: JSON.stringify(updates),
      });
      if (res.ok) {
        setLocalStudent(prev => ({ ...prev, ...updates }));
        onUpdate(studentId, updates);
      } else {
        alert('퍼널 단계 변경에 실패했습니다.');
      }
    } finally {
      setFunnelChanging(false);
    }
  }

  async function handleLeadStatusChange(newStatus: LeadStatus, extraUpdates?: Partial<Student>) {
    const updates: Partial<Student> = { lead_status: newStatus, ...extraUpdates };
    const res = await fetch(`/api/crm/students/${studentId}`, {
      method: 'PATCH', headers, body: JSON.stringify(updates),
    });
    if (res.ok) {
      setLocalStudent(prev => ({ ...prev, ...updates }));
      onUpdate(studentId, updates);
    } else {
      alert('상태 변경에 실패했습니다.');
    }
  }

  async function handleChurnConfirm(churnTag: string, churnType: ChurnType) {
    await handleLeadStatusChange('inactive', {
      funnel_stage: 'churned',
      churn_tag: churnTag,
      churn_type: churnType,
    });
    setShowChurnModal(false);
  }

  async function handleStartReactivation() {
    if (!reactivateStrategy.trim()) return;
    setReactivating(true);
    try {
      const res = await fetch(`/api/crm/students/${studentId}/reactivation`, {
        method: 'POST', headers,
        body: JSON.stringify({ strategy: reactivateStrategy.trim() }),
      });
      if (res.ok) {
        setLocalStudent(prev => ({ ...prev, lead_status: 'reactivating' }));
        onUpdate(studentId, { lead_status: 'reactivating' });
        setShowReactivateForm(false);
        setReactivateStrategy('');
      } else {
        const json = await res.json();
        alert(json.error?.message ?? '재활성화 시작에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setReactivating(false);
    }
  }

  return {
    funnelChanging, showFunnelMenu, setShowFunnelMenu,
    showChurnModal, setShowChurnModal,
    showPaymentModal, setShowPaymentModal,
    showReactivateForm, setShowReactivateForm,
    reactivateStrategy, setReactivateStrategy,
    reactivating,
    handleFunnelChange, handleLeadStatusChange, handleChurnConfirm, handleStartReactivation,
  };
}
