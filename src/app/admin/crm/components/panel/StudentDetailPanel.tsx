'use client';

import { useState, useEffect } from 'react';
import type { Student, ChurnType } from '@/types/crm';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { ChurnModal } from '../ChurnModal';
import { PaymentModal } from '../PaymentModal';
import { usePanelData } from './hooks/usePanelData';
import { useEditForm } from './hooks/useEditForm';
import { useMemoSection } from './hooks/useMemoSection';
import { useMemoAttachments } from './hooks/useMemoAttachments';
import { usePhoneCall } from './hooks/usePhoneCall';
import { useTimeline } from './hooks/useTimeline';
import { useFunnel } from './hooks/useFunnel';
import { useDiagnostic } from './hooks/useDiagnostic';
import { usePortalActions } from './hooks/usePortalActions';
import { PanelHeader } from './sections/PanelHeader';
import { InquirySection } from './sections/InquirySection';
import { StudentInfoSection } from './sections/StudentInfoSection';
import { MemoSection } from './sections/MemoSection';
import { TimelineSection } from './sections/TimelineSection';
import { StrategyHistorySection } from './sections/StrategyHistorySection';
import { SalesStrategySection } from './sections/SalesStrategySection';
import { PaymentHistorySection } from './sections/PaymentHistorySection';
import type { StudentDetailPanelProps } from './types';

export function StudentDetailPanel({ student, adminKey, onClose, onUpdate, onDelete }: StudentDetailPanelProps) {
  const { userName } = useAdminAuth();
  const { localStudent, setLocalStudent, timeline, setTimeline, editForm, setEditForm, loadingFresh } =
    usePanelData(student.id, adminKey, student);

  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [vipToggling, setVipToggling] = useState(false);

  async function handleVipToggle() {
    const newVip = !localStudent.is_vip;
    setVipToggling(true);
    try {
      const res = await fetch(`/api/crm/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ is_vip: newVip }),
      });
      if (res.ok) {
        setLocalStudent(prev => ({ ...prev, is_vip: newVip }));
        onUpdate(student.id, { is_vip: newVip });
      }
    } finally {
      setVipToggling(false);
    }
  }

  useEffect(() => {
    if (!localStudent.name || localStudent.name.trim().length < 2) return;
    fetch(`/api/crm/students?name_search=${encodeURIComponent(localStudent.name.trim())}`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then(r => r.json())
      .then(json => {
        const others = (json.data ?? [])
          .filter((s: { id: string; name: string }) => s.id !== localStudent.id)
          .map((s: { name: string }) => s.name);
        setDuplicateNames(others);
      })
      .catch(() => {});
  }, [localStudent.id, localStudent.name, adminKey]);

  const editFormHook = useEditForm({
    studentId: student.id, adminKey,
    localStudent, setLocalStudent,
    editForm, setEditForm,
    onUpdate,
  });

  const attachmentsHook = useMemoAttachments({ studentId: student.id, adminKey });

  const memoHook = useMemoSection({
    studentId: student.id, adminKey, userName,
    setTimeline,
    onUpdate: (id, updates) => onUpdate(id, updates as Partial<Student>),
    getAttachments: attachmentsHook.toAttachments,
    clearAttachments: attachmentsHook.clear,
  });

  // 인터넷 전화 → 통화 종료 후 녹음 전사·요약이 끝나면 메모가 타임라인에 자동 추가됨(realtime)
  const phoneHook = usePhoneCall({ studentId: student.id, adminKey });

  const timelineHook = useTimeline({
    studentId: student.id, adminKey,
    timeline,
    setTimeline,
    setPendingEdits: memoHook.setPendingEdits,
  });

  const funnelHook = useFunnel({
    studentId: student.id, adminKey,
    setLocalStudent,
    onUpdate,
  });

  const diagHook = useDiagnostic({
    studentId: student.id, adminKey,
    onUpdate: (id, updates) => onUpdate(id, updates as Partial<Student>),
  });

  const portalHook = usePortalActions({
    studentId: student.id,
    studentName: localStudent.name,
    adminKey, onDelete, onClose,
  });

  function scoreDisplay(): string {
    if (localStudent.previous_score_status === 'never_taken') return '미응시';
    if (localStudent.previous_score_status === 'dont_remember') return '기억 안남';
    const parts = [];
    if (localStudent.previous_rw_score !== null) parts.push(`RW ${localStudent.previous_rw_score}`);
    if (localStudent.previous_math_score !== null) parts.push(`Math ${localStudent.previous_math_score}`);
    return parts.length > 0 ? parts.join(' / ') : '—';
  }

  function handleBackdropClick() {
    if (editFormHook.isEditing) {
      if (window.confirm('편집 중인 내용이 저장되지 않습니다. 닫으시겠습니까?')) {
        editFormHook.handleCancelEdit();
        onClose();
      }
    } else {
      onClose();
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={handleBackdropClick} />
        <div className="relative w-full max-w-[440px] bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden shadow-xl">

          <PanelHeader
            localStudent={localStudent}
            duplicateNames={duplicateNames}
            portalCopied={portalHook.portalCopied}
            portalLoading={portalHook.portalLoading}
            deleting={portalHook.deleting}
            funnelChanging={funnelHook.funnelChanging}
            showFunnelMenu={funnelHook.showFunnelMenu}
            showReactivateForm={funnelHook.showReactivateForm}
            reactivateStrategy={funnelHook.reactivateStrategy}
            reactivating={funnelHook.reactivating}
            onClose={handleBackdropClick}
            onCopyPortalLink={portalHook.handleCopyPortalLink}
            onPreviewPortal={portalHook.handlePreviewPortal}
            onDelete={portalHook.handleDelete}
            onToggleFunnelMenu={() => {
              if (!funnelHook.funnelChanging && localStudent.lead_status !== 'inactive') {
                funnelHook.setShowFunnelMenu(!funnelHook.showFunnelMenu);
              }
            }}
            onFunnelChange={(stage) => { funnelHook.handleFunnelChange(stage); funnelHook.setShowFunnelMenu(false); }}
            onShowPayment={() => funnelHook.setShowPaymentModal(true)}
            onShowChurn={() => funnelHook.setShowChurnModal(true)}
            onShowReactivate={() => funnelHook.setShowReactivateForm(true)}
            onHideReactivate={() => { funnelHook.setShowReactivateForm(false); funnelHook.setReactivateStrategy(''); }}
            onReactivateStrategyChange={funnelHook.setReactivateStrategy}
            onStartReactivation={funnelHook.handleStartReactivation}
            onLeadStatusChange={(status) => {
              if (status === 'active') {
                funnelHook.handleLeadStatusChange('active', { funnel_stage: '1' });
              } else {
                funnelHook.handleLeadStatusChange('inactive');
              }
            }}
          />

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <InquirySection
              localStudent={localStudent}
              editForm={editForm}
              setEditForm={setEditForm}
              isEditingInquiry={editFormHook.isEditingInquiry}
              setIsEditingInquiry={editFormHook.setIsEditingInquiry}
              savingInquiry={editFormHook.savingInquiry}
              onSaveInquiry={editFormHook.handleSaveInquiry}
              onCancelInquiry={editFormHook.handleCancelInquiry}
            />

            <StudentInfoSection
              localStudent={localStudent}
              isEditing={editFormHook.isEditing}
              setIsEditing={editFormHook.setIsEditing}
              savingEdit={editFormHook.savingEdit}
              editForm={editForm}
              setEditForm={setEditForm}
              onSaveEdit={editFormHook.handleSaveEdit}
              onCancelEdit={editFormHook.handleCancelEdit}
              scoreDisplay={scoreDisplay()}
              adminKey={adminKey}
              diagLinked={diagHook.diagLinked}
              diagCandidates={diagHook.diagCandidates}
              showDiagPicker={diagHook.showDiagPicker}
              setShowDiagPicker={diagHook.setShowDiagPicker}
              diagLoading={diagHook.diagLoading}
              diagSearchQuery={diagHook.diagSearchQuery}
              setDiagSearchQuery={diagHook.setDiagSearchQuery}
              onDiagLink={diagHook.handleDiagLink}
              onVipToggle={handleVipToggle}
              vipToggling={vipToggling}
            />

            <StrategyHistorySection
              student={localStudent}
              adminKey={adminKey}
              onUpdate={(id, updates) => {
                // 패널의 localStudent도 갱신해야 저장 직후 화면에 반영됨 (PaymentHistorySection과 동일 패턴)
                setLocalStudent(prev => ({ ...prev, ...updates }));
                onUpdate(id, updates);
              }}
            />

            <SalesStrategySection
              student={localStudent}
              adminKey={adminKey}
            />

            <MemoSection
              memoText={memoHook.memoText}
              setMemoText={memoHook.setMemoText}
              savingMemo={memoHook.savingMemo}
              memoError={memoHook.memoError}
              setMemoError={memoHook.setMemoError}
              onAddMemo={memoHook.handleAddMemo}
              phone={phoneHook}
              staged={attachmentsHook.staged}
              onAddFiles={attachmentsHook.addFiles}
              onRemoveAttachment={attachmentsHook.remove}
              attachmentsUploading={attachmentsHook.uploading}
            />

            <TimelineSection
              studentId={student.id}
              adminKey={adminKey}
              timeline={timeline}
              loadingFresh={loadingFresh}
              publishError={timelineHook.publishError}
              publishing={timelineHook.publishing}
              memoSaving={timelineHook.memoSaving}
              aiLoadingFor={memoHook.aiLoadingFor}
              pendingEdits={memoHook.pendingEdits}
              setPendingEdits={memoHook.setPendingEdits}
              onAiCare={memoHook.triggerAiCare}
              onPublish={timelineHook.handlePublish}
              onUnpublish={timelineHook.handleUnpublish}
              onDeleteAi={timelineHook.handleDeleteAi}
              onEditMemo={timelineHook.handleEditMemo}
            />

            <PaymentHistorySection
              student={localStudent}
              adminKey={adminKey}
              onStudentUpdate={(updates) => {
                setLocalStudent(prev => ({ ...prev, ...updates }));
                onUpdate(student.id, updates);
              }}
            />
          </div>
        </div>
      </div>

      {funnelHook.showChurnModal && (
        <ChurnModal
          student={localStudent}
          onConfirm={(churnTag: string, churnType: ChurnType) => funnelHook.handleChurnConfirm(churnTag, churnType)}
          onClose={() => funnelHook.setShowChurnModal(false)}
        />
      )}

      {funnelHook.showPaymentModal && (
        <PaymentModal
          student={localStudent}
          adminKey={adminKey}
          onConfirm={(updatedStudent) => {
            onUpdate(student.id, { lead_status: updatedStudent.lead_status });
            setLocalStudent(prev => ({ ...prev, lead_status: updatedStudent.lead_status }));
            funnelHook.setShowPaymentModal(false);
          }}
          onClose={() => funnelHook.setShowPaymentModal(false)}
        />
      )}
    </>
  );
}
