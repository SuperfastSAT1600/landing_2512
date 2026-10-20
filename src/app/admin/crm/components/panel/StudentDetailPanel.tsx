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
import { useTimeline } from './hooks/useTimeline';
import { useFunnel } from './hooks/useFunnel';
import { useDiagnostic } from './hooks/useDiagnostic';
import { usePortalActions } from './hooks/usePortalActions';
import { useSignupActions } from './hooks/useSignupActions';
import { PanelHeader } from './sections/PanelHeader';
import { InquirySection } from './sections/InquirySection';
import { StudentInfoSection } from './sections/StudentInfoSection';
import { DiagnosticSection } from './sections/DiagnosticSection';
import { ExamScoreSection } from './sections/ExamScoreSection';
import { MemoSection } from './sections/MemoSection';
import { TimelineSection } from './sections/TimelineSection';
import { StrategyHistorySection } from './sections/StrategyHistorySection';
import { PaymentHistorySection } from './sections/PaymentHistorySection';
import { ActivityFeedSection } from './sections/ActivityFeedSection';
import { SrmDataCard } from './sections/SrmDataCard';
import { CoachRoomCard } from './sections/CoachRoomCard';
import { CoachRequestModal } from './sections/CoachRequestModal';
import { CoachResponsesSection } from './sections/CoachResponsesSection';
import { SrmStatusBar, type SubjectStatus } from './sections/SrmStatusBar';
import { rollUpSrmStatus } from '@/lib/srm-status';
import { PlaudRecordingPicker } from './PlaudRecordingPicker';
import type { StudentDetailPanelProps } from './types';
import type { ConsultationEntry } from '@/types/crm';
import { hasAnyStrategy, isActiveInitialSalesLead } from '@/lib/strategy-history';

export function StudentDetailPanel({
  student,
  adminKey,
  onClose,
  onUpdate,
  onDelete,
}: StudentDetailPanelProps) {
  const { userName } = useAdminAuth();
  const {
    localStudent,
    setLocalStudent,
    timeline,
    setTimeline,
    editForm,
    setEditForm,
    loadingFresh,
  } = usePanelData(student.id, adminKey, student, onClose);

  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [plaudOpen, setPlaudOpen] = useState(false);
  const [timelineOpenSignal, setTimelineOpenSignal] = useState(0);
  const [vipToggling, setVipToggling] = useState(false);
  const [attentionToggling, setAttentionToggling] = useState(false);
  const [coachRequestOpen, setCoachRequestOpen] = useState(false);
  const [coachResponsesVersion, setCoachResponsesVersion] = useState(0);

  // Plaud 초안 생성 성공 → 타임라인에 append (재진입 시 DB 순서와 동일하게 created_at 오름차순 정렬)
  // + 상담 타임라인 섹션을 자동으로 펼쳐 새 초안이 바로 보이게 한다(기본 접힘 상태라 안 보이던 문제 해결).
  function handlePlaudCreated(entry: ConsultationEntry) {
    setTimeline((prev) =>
      [...prev, entry].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    );
    setTimelineOpenSignal((s) => s + 1);
    onUpdate(student.id, { last_contacted_at: new Date().toISOString() } as Partial<Student>);
  }
  // 휴원 표시는 SRM 수강 상태(과목별 롤업) 기준 — CRM 휴원 기록(student_pauses)과 엇갈리지 않게 한다
  const [isPaused, setIsPaused] = useState(false);
  const [coachRoomVersion, setCoachRoomVersion] = useState(0);

  // 진단 테스트 현황(전용 퍼널) 변경 — 낙관적 반영 후 PATCH(onUpdate가 처리)
  function handleDiagFunnelChange(stage: number) {
    setLocalStudent((prev) => ({ ...prev, diagnostic_funnel_stage: stage }));
    onUpdate(student.id, { diagnostic_funnel_stage: stage });
  }

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
        setLocalStudent((prev) => ({ ...prev, is_vip: newVip }));
        onUpdate(student.id, { is_vip: newVip });
      }
    } finally {
      setVipToggling(false);
    }
  }

  async function handleAttentionToggle() {
    const newAttention = !localStudent.needs_attention;
    setAttentionToggling(true);
    try {
      const res = await fetch(`/api/crm/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ needs_attention: newAttention }),
      });
      if (res.ok) {
        setLocalStudent((prev) => ({ ...prev, needs_attention: newAttention }));
        onUpdate(student.id, { needs_attention: newAttention });
      }
    } finally {
      setAttentionToggling(false);
    }
  }

  useEffect(() => {
    if (!localStudent.name || localStudent.name.trim().length < 2) return;
    fetch(`/api/crm/students?name_search=${encodeURIComponent(localStudent.name.trim())}`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then((r) => r.json())
      .then((json) => {
        const others = (json.data ?? [])
          .filter((s: { id: string; name: string }) => s.id !== localStudent.id)
          .map((s: { name: string }) => s.name);
        setDuplicateNames(others);
      })
      .catch((err) => console.error('[StudentDetailPanel] duplicate names fetch failed:', err));
  }, [localStudent.id, localStudent.name, adminKey]);

  const applySrmStatuses = (list: SubjectStatus[]) =>
    setIsPaused(rollUpSrmStatus(list.map((x) => x.status ?? '')) === 'paused');

  const editFormHook = useEditForm({
    studentId: student.id,
    adminKey,
    localStudent,
    setLocalStudent,
    editForm,
    setEditForm,
    onUpdate,
  });

  const attachmentsHook = useMemoAttachments({ studentId: student.id, adminKey });

  const memoHook = useMemoSection({
    studentId: student.id,
    adminKey,
    userName,
    setTimeline,
    onUpdate: (id, updates) => onUpdate(id, updates as Partial<Student>),
    getAttachments: attachmentsHook.toAttachments,
    clearAttachments: attachmentsHook.clear,
  });

  const timelineHook = useTimeline({
    studentId: student.id,
    adminKey,
    timeline,
    setTimeline,
    setPendingEdits: memoHook.setPendingEdits,
  });

  const funnelHook = useFunnel({
    studentId: student.id,
    adminKey,
    setLocalStudent,
    onUpdate,
  });

  const diagHook = useDiagnostic({
    studentId: student.id,
    adminKey,
    onUpdate: (id, updates) => onUpdate(id, updates as Partial<Student>),
  });

  const portalHook = usePortalActions({
    studentId: student.id,
    studentName: localStudent.name,
    adminKey,
    initialPortalToken: localStudent.portal_token,
    onPortalIssued: (token) =>
      onUpdate(student.id, { portal_token: token } as Partial<typeof student>),
    onDelete,
    onClose,
  });

  const signupHook = useSignupActions({
    studentId: student.id,
    adminKey,
    initialSignupToken: localStudent.signup_token,
    signupDoneAt: localStudent.signup_done_at,
    onUpdate: (id, updates) => onUpdate(id, updates as Partial<Student>),
  });

  function scoreDisplay(): string {
    if (localStudent.previous_score_status === 'never_taken') return '미응시';
    if (localStudent.previous_score_status === 'dont_remember') return '기억 안남';
    const parts = [];
    if (localStudent.previous_rw_score !== null) parts.push(`RW ${localStudent.previous_rw_score}`);
    if (localStudent.previous_math_score !== null)
      parts.push(`Math ${localStudent.previous_math_score}`);
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
        {/* 맨 왼쪽 코치룸 수업 내역 (넓은 화면에서만) */}
        <CoachRoomCard key={coachRoomVersion} studentId={student.id} adminKey={adminKey} />
        {/* 왼쪽 SRM 데이터 카드 (데스크톱에서만) */}
        <SrmDataCard studentId={student.id} studentName={localStudent.name} adminKey={adminKey} />
        <div className="relative w-full max-w-[440px] bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden shadow-xl">
          <PanelHeader
            localStudent={localStudent}
            duplicateNames={duplicateNames}
            isPaused={isPaused}
            hasPortal={portalHook.hasPortal}
            portalCopied={portalHook.portalCopied}
            portalLoading={portalHook.portalLoading}
            hasSignup={signupHook.hasSignup}
            signupConsumed={signupHook.isConsumed}
            signupCopied={signupHook.signupCopied}
            signupLoading={signupHook.signupLoading}
            deleting={portalHook.deleting}
            funnelChanging={funnelHook.funnelChanging}
            showFunnelMenu={funnelHook.showFunnelMenu}
            showReactivateForm={funnelHook.showReactivateForm}
            reactivateStrategy={funnelHook.reactivateStrategy}
            reactivating={funnelHook.reactivating}
            onClose={handleBackdropClick}
            onIssuePortal={portalHook.handleIssuePortal}
            onCopyPortalLink={portalHook.handleCopyPortalLink}
            onPreviewPortal={portalHook.handlePreviewPortal}
            onCopySignupLink={signupHook.handleCopySignupLink}
            onRegenerateSignup={signupHook.handleRegenerate}
            onOpenCoachRequest={() => setCoachRequestOpen(true)}
            onDelete={portalHook.handleDelete}
            onToggleFunnelMenu={() => {
              if (!funnelHook.funnelChanging && localStudent.lead_status !== 'inactive') {
                funnelHook.setShowFunnelMenu(!funnelHook.showFunnelMenu);
              }
            }}
            onFunnelChange={(stage) => {
              funnelHook.handleFunnelChange(stage);
              funnelHook.setShowFunnelMenu(false);
            }}
            onShowPayment={() => funnelHook.setShowPaymentModal(true)}
            onShowChurn={() => funnelHook.setShowChurnModal(true)}
            onShowReactivate={() => funnelHook.setShowReactivateForm(true)}
            onHideReactivate={() => {
              funnelHook.setShowReactivateForm(false);
              funnelHook.setReactivateStrategy('');
            }}
            onReactivateStrategyChange={funnelHook.setReactivateStrategy}
            onStartReactivation={funnelHook.handleStartReactivation}
            onLeadStatusChange={(status) => {
              if (status === 'active') {
                // 재시도 세일즈에서 활성화 시 최초세일즈 칸반으로 이동하도록 retry 필드 초기화
                funnelHook.handleLeadStatusChange('active', {
                  funnel_stage: '1',
                  retry_strategy_id: null,
                  retry_stage: null,
                  retry_assigned_at: null,
                });
              } else {
                funnelHook.handleLeadStatusChange('inactive');
              }
            }}
          />
          <SrmStatusBar
            key={student.id}
            studentId={student.id}
            adminKey={adminKey}
            onLoad={applySrmStatuses}
            onChange={(list) => {
              applySrmStatuses(list);
              setCoachRoomVersion((v) => v + 1);
            }}
          />

          <div className="flex-1 overflow-y-auto">
            <InquirySection
              localStudent={localStudent}
              adminKey={adminKey}
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
              onVipToggle={handleVipToggle}
              vipToggling={vipToggling}
              onAttentionToggle={handleAttentionToggle}
              attentionToggling={attentionToggling}
            />

            <CoachResponsesSection studentId={student.id} adminKey={adminKey} version={coachResponsesVersion} />

            <DiagnosticSection
              localStudent={localStudent}
              onDiagFunnelChange={handleDiagFunnelChange}
              diagLinked={diagHook.diagLinked}
              diagLegacy={diagHook.diagLegacy}
              diagCandidates={diagHook.diagCandidates}
              showDiagPicker={diagHook.showDiagPicker}
              setShowDiagPicker={diagHook.setShowDiagPicker}
              diagLoading={diagHook.diagLoading}
              diagSearchQuery={diagHook.diagSearchQuery}
              setDiagSearchQuery={diagHook.setDiagSearchQuery}
              onDiagLink={diagHook.handleDiagLink}
            />

            <ExamScoreSection student={localStudent} adminKey={adminKey} />

            <StrategyHistorySection
              student={localStudent}
              adminKey={adminKey}
              onUpdate={(id, updates) => {
                // 패널의 localStudent도 갱신해야 저장 직후 화면에 반영됨 (PaymentHistorySection과 동일 패턴)
                setLocalStudent((prev) => ({ ...prev, ...updates }));
                onUpdate(id, updates);
              }}
            />

            <MemoSection
              memoText={memoHook.memoText}
              setMemoText={memoHook.setMemoText}
              parentText={memoHook.parentText}
              setParentText={memoHook.setParentText}
              parentDrafting={memoHook.parentDrafting}
              onDraftParent={memoHook.draftParentNote}
              savingMemo={memoHook.savingMemo}
              memoError={memoHook.memoError}
              setMemoError={memoHook.setMemoError}
              onAddMemo={memoHook.handleAddMemo}
              staged={attachmentsHook.staged}
              onAddFiles={attachmentsHook.addFiles}
              onRemoveAttachment={attachmentsHook.remove}
              attachmentsUploading={attachmentsHook.uploading}
              onOpenPlaud={() => setPlaudOpen(true)}
              blocked={isActiveInitialSalesLead(localStudent) && !hasAnyStrategy(localStudent)}
              blockedReason="이 리드에 적용된 전략이 없어 메모를 입력할 수 없습니다."
            />

            <TimelineSection
              studentId={student.id}
              adminKey={adminKey}
              timeline={timeline}
              loadingFresh={loadingFresh}
              openSignal={timelineOpenSignal}
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
              onDeleteMemo={timelineHook.handleDeleteMemo}
              onCoachShare={timelineHook.handleCoachShare}
            />

            <PaymentHistorySection
              student={localStudent}
              adminKey={adminKey}
              onStudentUpdate={(updates) => {
                setLocalStudent((prev) => ({ ...prev, ...updates }));
                onUpdate(student.id, updates);
              }}
            />

            <ActivityFeedSection student={localStudent} adminKey={adminKey} />
          </div>
        </div>
      </div>

      {coachRequestOpen && (
        <CoachRequestModal
          studentId={student.id}
          studentName={localStudent.name}
          adminKey={adminKey}
          onClose={() => setCoachRequestOpen(false)}
          onCreated={() => setCoachResponsesVersion((v) => v + 1)}
        />
      )}

      {funnelHook.showChurnModal && (
        <ChurnModal
          student={localStudent}
          adminKey={adminKey}
          onConfirm={(churnTag: string, churnType: ChurnType) =>
            funnelHook.handleChurnConfirm(churnTag, churnType)
          }
          onClose={() => funnelHook.setShowChurnModal(false)}
        />
      )}

      {funnelHook.showPaymentModal && (
        <PaymentModal
          student={localStudent}
          adminKey={adminKey}
          onConfirm={(updatedStudent) => {
            onUpdate(student.id, { lead_status: updatedStudent.lead_status });
            setLocalStudent((prev) => ({ ...prev, lead_status: updatedStudent.lead_status }));
            funnelHook.setShowPaymentModal(false);
          }}
          onClose={() => funnelHook.setShowPaymentModal(false)}
        />
      )}

      {plaudOpen && (
        <PlaudRecordingPicker
          studentId={student.id}
          studentName={localStudent.name}
          adminKey={adminKey}
          onClose={() => setPlaudOpen(false)}
          onCreated={handlePlaudCreated}
        />
      )}
    </>
  );
}
