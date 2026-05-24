'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, Sparkles, Check, Clock, AlertTriangle, RefreshCw, UserX, Pencil } from 'lucide-react';
import type { Student, ConsultationEntry, AiCareResult, FunnelStage, LeadStatus, ChurnType } from '@/types/crm';
import {
  FUNNEL_STAGE_LABELS, SCHOOL_TYPE_LABELS, CONTACT_TYPE_LABELS, TIMEZONE_LABEL_MAP,
  GRADE_OPTIONS, INQUIRY_CHANNEL_OPTIONS, TRAFFIC_SOURCE_OPTIONS, CONTENT_AUTHOR_OPTIONS,
  B2B_PARTNER_OPTIONS, TIMEZONE_OPTIONS,
} from '@/types/crm';
import { ChurnModal } from './ChurnModal';

// ─── 퍼널 가이드 ──────────────────────────────────────────────────────────────

const SALES_STAGES_ONLY: FunnelStage[] = ['1', '2', '3a', '3b', '4', '5a', '5b', '6', '7'];

interface FunnelGuideItem { doing: string; next: string; nextStage?: FunnelStage }

const FUNNEL_GUIDE: Record<string, FunnelGuideItem> = {
  '1':  { doing: '학생·학부모에게 첫 메시지를 발송한 단계입니다.', next: '세일즈 콜 일정을 잡아 확정하세요.', nextStage: '2' },
  '2':  { doing: '세일즈 콜 일정이 확정된 상태입니다.', next: '콜 전 진단테스트가 필요하면 3a로, 바로 콜을 진행하면 4로 이동하세요.' },
  '3a': { doing: '세일즈 콜 전 진단테스트를 기다리고 있습니다.', next: '학생이 테스트를 제출하면 3b로 이동하세요.', nextStage: '3b' },
  '3b': { doing: '진단테스트 제출이 완료됐습니다.', next: '세일즈 콜을 진행하세요.', nextStage: '4' },
  '4':  { doing: '첫 세일즈 콜을 완료했습니다.', next: '콜 후 진단테스트가 필요하면 5a로, 리포트 콜 일정을 바로 잡으면 6으로 이동하세요.' },
  '5a': { doing: '세일즈 콜 후 진단테스트를 기다리고 있습니다.', next: '학생이 테스트를 제출하면 5b로 이동하세요.', nextStage: '5b' },
  '5b': { doing: '콜 후 진단테스트 제출이 완료됐습니다.', next: '리포트 세일즈 콜 일정을 잡으세요.', nextStage: '6' },
  '6':  { doing: '진단 리포트 콜 일정이 확정된 상태입니다.', next: '리포트 콜을 진행하세요.', nextStage: '7' },
  '7':  { doing: '리포트 세일즈 콜이 완료됐습니다.', next: '결제를 완료하면 결제 완료 탭으로 이동하세요.' },
  'churned': { doing: '이탈 처리된 학생입니다.', next: '재활성화가 필요하면 아래 상태 관리에서 버튼을 눌러주세요.' },
};

// ─── 편집 폼 ──────────────────────────────────────────────────────────────────

interface EditForm {
  name: string; grade: string; school_type: string; contact_type: string;
  parent_phone: string; parent_timezone: string; desired_subjects: string;
  previous_score_status: string; previous_rw_score: string; previous_math_score: string;
  target_score: string; target_test_date: string; target_test_date_2: string;
  inquiry_date: string; inquiry_channel: string; traffic_source: string;
  content_author: string; lead_type: string; b2b_partner: string;
}

function studentToEditForm(s: Student): EditForm {
  return {
    name: s.name, grade: s.grade, school_type: s.school_type,
    contact_type: s.contact_type ?? 'phone', parent_phone: s.parent_phone,
    parent_timezone: s.parent_timezone ?? 'Asia/Seoul', desired_subjects: s.desired_subjects,
    previous_score_status: s.previous_score_status,
    previous_rw_score: s.previous_rw_score?.toString() ?? '',
    previous_math_score: s.previous_math_score?.toString() ?? '',
    target_score: s.target_score?.toString() ?? '',
    target_test_date: s.target_test_date ?? '', target_test_date_2: s.target_test_date_2 ?? '',
    inquiry_date: s.inquiry_date ?? '', inquiry_channel: s.inquiry_channel ?? '',
    traffic_source: s.traffic_source ?? '', content_author: s.content_author ?? '',
    lead_type: s.lead_type ?? 'B2C', b2b_partner: s.b2b_partner ?? '',
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface StudentDetailPanelProps {
  student: Student;
  adminKey: string;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Student>) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StudentDetailPanel({ student, adminKey, onClose, onUpdate }: StudentDetailPanelProps) {
  const [memoText, setMemoText] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const [memoError, setMemoError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiCareResult | null>(null);
  const [aiEntryId, setAiEntryId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [timeline, setTimeline] = useState<ConsultationEntry[]>(student.consultation_timeline ?? []);
  const [localStudent, setLocalStudent] = useState<Student>(student);
  const [loadingFresh, setLoadingFresh] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(studentToEditForm(student));
  const [savingEdit, setSavingEdit] = useState(false);
  const [funnelChanging, setFunnelChanging] = useState(false);
  const [showChurnModal, setShowChurnModal] = useState(false);
  const [showReactivateForm, setShowReactivateForm] = useState(false);
  const [reactivateStrategy, setReactivateStrategy] = useState('');
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchFresh() {
      try {
        const res = await fetch(`/api/crm/students/${student.id}`, {
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
  }, [student.id, adminKey]);

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  function handleBackdropClick() {
    if (isEditing) {
      if (window.confirm('편집 중인 내용이 저장되지 않습니다. 닫으시겠습니까?')) {
        handleCancelEdit();
        onClose();
      }
    } else {
      onClose();
    }
  }

  async function handleSaveEdit() {
    setSavingEdit(true);
    try {
      const updates: Partial<Student> = {
        name: editForm.name.trim(), grade: editForm.grade,
        school_type: editForm.school_type as Student['school_type'],
        contact_type: editForm.contact_type as Student['contact_type'],
        parent_phone: editForm.parent_phone.trim(),
        parent_timezone: editForm.parent_timezone || null,
        desired_subjects: editForm.desired_subjects as Student['desired_subjects'],
        previous_score_status: editForm.previous_score_status as Student['previous_score_status'],
        previous_rw_score: editForm.previous_rw_score ? parseInt(editForm.previous_rw_score) : null,
        previous_math_score: editForm.previous_math_score ? parseInt(editForm.previous_math_score) : null,
        target_score: editForm.target_score ? parseInt(editForm.target_score) : null,
        target_test_date: editForm.target_test_date || null,
        target_test_date_2: editForm.target_test_date_2 || null,
        inquiry_date: editForm.inquiry_date || null,
        inquiry_channel: (editForm.inquiry_channel as Student['inquiry_channel']) || null,
        traffic_source: (editForm.traffic_source as Student['traffic_source']) || null,
        content_author: (editForm.content_author as Student['content_author']) || null,
        lead_type: editForm.lead_type as Student['lead_type'],
        b2b_partner: editForm.lead_type === 'B2B' && editForm.b2b_partner
          ? editForm.b2b_partner as Student['b2b_partner'] : null,
      };
      const res = await fetch(`/api/crm/students/${student.id}`, {
        method: 'PATCH', headers, body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = { ...localStudent, ...updates };
        setLocalStudent(updated);
        onUpdate(student.id, updates);
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

  async function handleAddMemo() {
    if (!memoText.trim()) return;
    setSavingMemo(true);
    setMemoError('');
    try {
      const res = await fetch(`/api/crm/students/${student.id}/memo`, {
        method: 'POST', headers, body: JSON.stringify({ raw_memo: memoText.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setTimeline(prev => [json.data, ...prev]);
        setMemoText('');
        onUpdate(student.id, { last_contacted_at: new Date().toISOString() });
      } else {
        setMemoError(json.error?.message ?? '메모 저장에 실패했습니다.');
      }
    } catch {
      setMemoError('네트워크 오류가 발생했습니다.');
    } finally {
      setSavingMemo(false);
    }
  }

  async function handleAiCare(entry: ConsultationEntry) {
    setAiLoading(true);
    setAiResult(null);
    setAiEntryId(entry.id);
    try {
      const res = await fetch('/api/crm/ai-care', {
        method: 'POST', headers, body: JSON.stringify({ raw_memo: entry.raw_memo }),
      });
      const json = await res.json();
      if (res.ok && json.data) setAiResult(json.data);
    } finally {
      setAiLoading(false);
    }
  }

  async function handlePublish() {
    if (!aiResult || !aiEntryId) return;
    setPublishing(true);
    setPublishError('');
    try {
      const res = await fetch(`/api/crm/students/${student.id}/publish-memo`, {
        method: 'POST', headers,
        body: JSON.stringify({
          entry_id: aiEntryId, ai_purified: aiResult.purified,
          ai_deleted_items: aiResult.deleted_items, ai_coach_history: aiResult.coach_history,
        }),
      });
      if (res.ok) {
        setTimeline(prev => prev.map(e =>
          e.id === aiEntryId
            ? { ...e, ai_purified: aiResult!.purified, ai_coach_history: aiResult!.coach_history, published: true }
            : e
        ));
        setAiResult(null);
        setAiEntryId(null);
      } else {
        const json = await res.json();
        setPublishError(json.error?.message ?? '게시에 실패했습니다.');
      }
    } catch {
      setPublishError('네트워크 오류가 발생했습니다.');
    } finally {
      setPublishing(false);
    }
  }

  async function handleFunnelChange(newStage: FunnelStage) {
    setFunnelChanging(true);
    try {
      const res = await fetch(`/api/crm/students/${student.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ funnel_stage: newStage }),
      });
      if (res.ok) {
        const updated = { ...localStudent, funnel_stage: newStage };
        setLocalStudent(updated);
        onUpdate(student.id, { funnel_stage: newStage });
      } else {
        alert('퍼널 단계 변경에 실패했습니다.');
      }
    } finally {
      setFunnelChanging(false);
    }
  }

  async function handleLeadStatusChange(newStatus: LeadStatus, extraUpdates?: Partial<Student>) {
    const updates: Partial<Student> = { lead_status: newStatus, ...extraUpdates };
    const res = await fetch(`/api/crm/students/${student.id}`, {
      method: 'PATCH', headers, body: JSON.stringify(updates),
    });
    if (res.ok) {
      setLocalStudent(prev => ({ ...prev, ...updates }));
      onUpdate(student.id, updates);
    } else {
      alert('상태 변경에 실패했습니다.');
    }
  }

  async function handleStartReactivation() {
    if (!reactivateStrategy.trim()) return;
    setReactivating(true);
    try {
      const res = await fetch(`/api/crm/students/${student.id}/reactivation`, {
        method: 'POST', headers,
        body: JSON.stringify({ strategy: reactivateStrategy.trim() }),
      });
      if (res.ok) {
        setLocalStudent(prev => ({ ...prev, lead_status: 'reactivating' }));
        onUpdate(student.id, { lead_status: 'reactivating' });
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

  const guide = FUNNEL_GUIDE[localStudent.funnel_stage];

  const scoreDisplay = () => {
    if (localStudent.previous_score_status === 'never_taken') return '미응시';
    if (localStudent.previous_score_status === 'dont_remember') return '기억 안남';
    const parts = [];
    if (localStudent.previous_rw_score !== null) parts.push(`RW ${localStudent.previous_rw_score}`);
    if (localStudent.previous_math_score !== null) parts.push(`Math ${localStudent.previous_math_score}`);
    return parts.length > 0 ? parts.join(' / ') : '—';
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={handleBackdropClick} />
        <div className="relative w-full max-w-xl bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{localStudent.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {localStudent.grade} · {SCHOOL_TYPE_LABELS[localStudent.school_type]} · {localStudent.desired_subjects}
              </p>
            </div>
            <button onClick={handleBackdropClick} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ── 기본 정보 (편집 가능) ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">학생 정보</h3>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <Pencil size={11} />편집
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={handleCancelEdit} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">취소</button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {savingEdit ? '저장 중...' : '저장'}
                    </button>
                  </div>
                )}
              </div>
              {isEditing
                ? <StudentInfoEdit form={editForm} onChange={setEditForm} />
                : <StudentInfoView student={localStudent} scoreDisplay={scoreDisplay()} />
              }
            </section>

            {/* ── 퍼널 단계 ── */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">퍼널 단계</h3>
              <select
                value={localStudent.funnel_stage}
                onChange={e => handleFunnelChange(e.target.value as FunnelStage)}
                disabled={funnelChanging}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                {SALES_STAGES_ONLY.map(stage => (
                  <option key={stage} value={stage}>{stage}. {FUNNEL_STAGE_LABELS[stage]}</option>
                ))}
                {localStudent.funnel_stage === 'churned' && (
                  <option value="churned">{FUNNEL_STAGE_LABELS['churned']}</option>
                )}
              </select>
              {funnelChanging && (
                <p className="mt-1 text-[11px] text-gray-400">변경 저장 중...</p>
              )}
              {guide && !funnelChanging && (
                <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 space-y-1.5">
                  <p className="text-[11px] text-blue-600">{guide.doing}</p>
                  <div className="flex items-start gap-1.5">
                    <ChevronRight size={12} className="text-blue-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-blue-700 font-medium">{guide.next}</p>
                  </div>
                  {guide.nextStage && (
                    <button
                      onClick={() => handleFunnelChange(guide.nextStage!)}
                      className="mt-1 text-[11px] font-bold text-blue-600 hover:text-blue-500 underline underline-offset-2 transition-colors"
                    >
                      {FUNNEL_STAGE_LABELS[guide.nextStage]}(으)로 이동 →
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* ── 학생 상태 관리 ── */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">학생 상태</h3>
              <div className="flex flex-col gap-2">
                {localStudent.lead_status === 'active' && (
                  <button
                    onClick={() => setShowChurnModal(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <UserX size={13} />
                    이탈 처리 (칸반에서 숨김)
                  </button>
                )}

                {localStudent.lead_status === 'inactive' && !showReactivateForm && (
                  <button
                    onClick={() => setShowReactivateForm(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 text-xs text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    <RefreshCw size={13} />
                    재활성화 시도 시작
                  </button>
                )}

                {localStudent.lead_status === 'inactive' && showReactivateForm && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs font-medium text-amber-700">재활성화 전략 메모</p>
                    <textarea
                      value={reactivateStrategy}
                      onChange={e => setReactivateStrategy(e.target.value)}
                      placeholder="어떤 전략으로 재접근할 것인지 기록하세요..."
                      rows={3}
                      className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleStartReactivation}
                        disabled={reactivating || !reactivateStrategy.trim()}
                        className="flex-1 text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {reactivating ? '시작 중...' : '재활성화 시작'}
                      </button>
                      <button
                        onClick={() => { setShowReactivateForm(false); setReactivateStrategy(''); }}
                        className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {localStudent.lead_status === 'reactivating' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLeadStatusChange('active', { funnel_stage: '1' })}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-blue-200 text-xs text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Check size={13} />
                      활성화 (1단계로 복귀)
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('재활성화 시도를 중단하고 이탈 확정하시겠습니까?')) {
                          handleLeadStatusChange('inactive');
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <UserX size={13} />
                      이탈 확정
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-gray-400">
                  현재: {localStudent.lead_status === 'active' ? '활성' : localStudent.lead_status === 'inactive' ? '비활성 (숨김)' : '재활성화 시도 중'}
                </p>
              </div>
            </section>

            {/* ── 상담 메모 ── */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">상담 메모 추가</h3>
              <textarea
                value={memoText}
                onChange={e => { setMemoText(e.target.value); setMemoError(''); }}
                placeholder="상담 내용을 자유롭게 입력하세요..."
                rows={4}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500"
              />
              {memoError && <p className="mt-1 text-xs text-red-500">{memoError}</p>}
              <button
                onClick={handleAddMemo}
                disabled={!memoText.trim() || savingMemo}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-sm font-semibold text-white transition-colors"
              >
                {savingMemo ? '저장 중...' : '메모 저장'}
              </button>
            </section>

            {/* ── 상담 타임라인 ── */}
            <section>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                상담 타임라인
                {!loadingFresh && timeline.length > 0 && (
                  <span className="text-gray-400 font-normal normal-case ml-1">({timeline.length}건)</span>
                )}
              </h3>
              {loadingFresh && (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
                </div>
              )}
              {!loadingFresh && timeline.length === 0 && (
                <p className="text-sm text-gray-400">상담 메모가 없습니다.</p>
              )}
              {publishError && (
                <p className="mb-2 text-xs text-red-500">{publishError}</p>
              )}
              <div className="space-y-3">
                {timeline.map(entry => (
                  <TimelineEntry
                    key={entry.id}
                    entry={entry}
                    isAiTarget={aiEntryId === entry.id}
                    aiLoading={aiLoading && aiEntryId === entry.id}
                    aiResult={aiEntryId === entry.id ? aiResult : null}
                    publishing={publishing}
                    onAiCare={() => handleAiCare(entry)}
                    onPublish={handlePublish}
                    onCancelAi={() => { setAiResult(null); setAiEntryId(null); setPublishError(''); }}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {showChurnModal && (
        <ChurnModal
          student={localStudent}
          onConfirm={(churnTag: string, churnType: ChurnType) => {
            handleLeadStatusChange('inactive', {
              funnel_stage: 'churned',
              churn_tag: churnTag,
              churn_type: churnType,
            });
            setShowChurnModal(false);
          }}
          onClose={() => setShowChurnModal(false)}
        />
      )}
    </>
  );
}

// ─── StudentInfoView ──────────────────────────────────────────────────────────

function StudentInfoView({ student, scoreDisplay }: { student: Student; scoreDisplay: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500">
        <InlineField label="문의" value={student.inquiry_date ?? '—'} />
        <Sep /><InlineField label="채널" value={student.inquiry_channel ?? '(미상)'} />
        <Sep /><InlineField label="소스" value={student.traffic_source ?? '(미상)'} />
        {student.content_author && (<><Sep /><InlineField label="작성자" value={student.content_author} /></>)}
        <Sep /><InlineField label="구분" value={student.lead_type ?? '—'} />
        {student.b2b_partner && (<><Sep /><InlineField label="파트너" value={student.b2b_partner} /></>)}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500">
        <InlineField
          label={student.contact_type ? CONTACT_TYPE_LABELS[student.contact_type] : '연락처'}
          value={student.parent_phone || '—'}
        />
        {student.parent_timezone && (
          <><Sep /><InlineField label="시간대" value={TIMEZONE_LABEL_MAP[student.parent_timezone] ?? student.parent_timezone} /></>
        )}
        {student.campaign_tags && student.campaign_tags.length > 0 && (
          <><Sep /><span className="flex gap-1">
            {student.campaign_tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">{tag}</span>
            ))}
          </span></>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <InfoRow label="학년" value={`${student.grade} · ${SCHOOL_TYPE_LABELS[student.school_type]}`} />
        <InfoRow label="희망 과목" value={student.desired_subjects} />
        <InfoRow label="직전 점수" value={scoreDisplay} />
        <InfoRow label="목표 점수" value={student.target_score ? `${student.target_score}점` : '미정'} />
        <InfoRow
          label="목표 시험일"
          value={student.target_test_date
            ? student.target_test_date_2 ? `${student.target_test_date} / ${student.target_test_date_2}` : student.target_test_date
            : '미정'}
        />
      </div>
    </div>
  );
}

// ─── StudentInfoEdit ──────────────────────────────────────────────────────────

function StudentInfoEdit({ form, onChange }: { form: EditForm; onChange: (f: EditForm) => void }) {
  const set = (key: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...form, [key]: e.target.value });

  return (
    <div className="space-y-3 bg-white rounded-xl border border-blue-200 p-4">
      <p className="text-[11px] text-blue-500 font-medium">편집 모드 — 저장 버튼을 눌러야 반영됩니다</p>
      <EditField label="이름">
        <input value={form.name} onChange={set('name')} className={inputCls} placeholder="홍길동" />
      </EditField>
      <div className="grid grid-cols-2 gap-2">
        <EditField label="학년">
          <select value={form.grade} onChange={set('grade')} className={selectCls}>
            <option value="">선택</option>
            {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </EditField>
        <EditField label="재학 유형">
          <select value={form.school_type} onChange={set('school_type')} className={selectCls}>
            <option value="domestic_us">미국 현지</option>
            <option value="korean_special">한국 특례</option>
            <option value="international">국제학교</option>
            <option value="other">기타</option>
          </select>
        </EditField>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <EditField label="연락 수단">
          <select value={form.contact_type} onChange={set('contact_type')} className={selectCls}>
            <option value="phone">핸드폰</option>
            <option value="kakao">카카오톡</option>
            <option value="email">이메일</option>
          </select>
        </EditField>
        <EditField label="연락처">
          <input value={form.parent_phone} onChange={set('parent_phone')} className={inputCls} />
        </EditField>
      </div>
      <EditField label="거주 국가 / 시간대">
        <select value={form.parent_timezone} onChange={set('parent_timezone')} className={selectCls}>
          {TIMEZONE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </EditField>
      <EditField label="희망 과목">
        <select value={form.desired_subjects} onChange={set('desired_subjects')} className={selectCls}>
          <optgroup label="SAT">
            <option value="RW">RW</option>
            <option value="Math">Math</option>
            <option value="Both">Both</option>
          </optgroup>
          <optgroup label="SSAT">
            <option value="SSAT Math">SSAT Math</option>
          </optgroup>
          <optgroup label="AP">
            <option value="AP Calculus BC">AP Calculus BC</option>
            <option value="AP US History">AP US History</option>
            <option value="AP Physics 1">AP Physics 1</option>
            <option value="AP Biology">AP Biology</option>
            <option value="AP Psychology">AP Psychology</option>
            <option value="AP World History">AP World History</option>
            <option value="AP Computer Science A">AP Computer Science A</option>
            <option value="AP Computer Science Principles">AP Computer Science Principles</option>
            <option value="AP Macroeconomics">AP Macroeconomics</option>
            <option value="AP Microeconomics">AP Microeconomics</option>
            <option value="AP US Government and Politics">AP US Government and Politics</option>
            <option value="AP Comparative Government and Politics">AP Comparative Government and Politics</option>
          </optgroup>
        </select>
      </EditField>
      <EditField label="직전 점수 상태">
        <select value={form.previous_score_status} onChange={set('previous_score_status')} className={selectCls}>
          <option value="scored">응시함</option>
          <option value="never_taken">미응시</option>
          <option value="dont_remember">기억안남</option>
        </select>
      </EditField>
      {form.previous_score_status === 'scored' && (
        <div className="grid grid-cols-2 gap-2">
          <EditField label="직전 RW">
            <input type="number" value={form.previous_rw_score} onChange={set('previous_rw_score')} className={inputCls} placeholder="200-800" min={200} max={800} />
          </EditField>
          <EditField label="직전 Math">
            <input type="number" value={form.previous_math_score} onChange={set('previous_math_score')} className={inputCls} placeholder="200-800" min={200} max={800} />
          </EditField>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <EditField label="목표 점수">
          <input type="number" value={form.target_score} onChange={set('target_score')} className={inputCls} placeholder="800-1600" min={800} max={1600} />
        </EditField>
        <EditField label="목표 시험일">
          <input type="date" value={form.target_test_date} onChange={set('target_test_date')} className={inputCls} />
        </EditField>
      </div>
      <EditField label="2차 목표 시험일">
        <input type="date" value={form.target_test_date_2} onChange={set('target_test_date_2')} className={inputCls} />
      </EditField>
      <div className="pt-2 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 font-medium mb-2">인입 정보</p>
        <div className="grid grid-cols-2 gap-2">
          <EditField label="문의 날짜">
            <input type="date" value={form.inquiry_date} onChange={set('inquiry_date')} className={inputCls} />
          </EditField>
          <EditField label="인입 채널">
            <select value={form.inquiry_channel} onChange={set('inquiry_channel')} className={selectCls}>
              <option value="">(미상)</option>
              {INQUIRY_CHANNEL_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </EditField>
          <EditField label="유입 소스">
            <select value={form.traffic_source} onChange={set('traffic_source')} className={selectCls}>
              <option value="">(미상)</option>
              {TRAFFIC_SOURCE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </EditField>
          <EditField label="콘텐츠 작성자">
            <select value={form.content_author} onChange={set('content_author')} className={selectCls}>
              <option value="">(미상)</option>
              {CONTENT_AUTHOR_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </EditField>
          <EditField label="구분">
            <select value={form.lead_type} onChange={set('lead_type')} className={selectCls}>
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
          </EditField>
          {form.lead_type === 'B2B' && (
            <EditField label="B2B 파트너사">
              <select value={form.b2b_partner} onChange={set('b2b_partner')} className={selectCls}>
                <option value="">선택</option>
                {B2B_PARTNER_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </EditField>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function Sep() { return <span className="text-gray-200">|</span>; }

function InlineField({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-gray-400">{label}</span>
      <span className="ml-1 text-gray-700 font-medium">{value}</span>
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-100 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900 font-medium">{value}</p>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all';
const selectCls = 'w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 outline-none transition-all';

// ─── TimelineEntry ────────────────────────────────────────────────────────────

interface TimelineEntryProps {
  entry: ConsultationEntry;
  isAiTarget: boolean;
  aiLoading: boolean;
  aiResult: AiCareResult | null;
  publishing: boolean;
  onAiCare: () => void;
  onPublish: () => void;
  onCancelAi: () => void;
}

function TimelineEntry({ entry, isAiTarget, aiLoading, aiResult, publishing, onAiCare, onPublish, onCancelAi }: TimelineEntryProps) {
  const date = new Date(entry.created_at).toLocaleString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="bg-gray-100 rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-gray-500" />
            <span className="text-xs text-gray-500">{date}</span>
          </div>
          {entry.published && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Check size={11} /> 학부모 노출
            </span>
          )}
        </div>
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{entry.raw_memo}</p>
        {!entry.published && !isAiTarget && (
          <button onClick={onAiCare} className="mt-3 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <Sparkles size={13} />AI 케어 메시지로 변환
          </button>
        )}
        {isAiTarget && aiLoading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
            AI가 메모를 분석 중입니다...
          </div>
        )}
      </div>

      {isAiTarget && aiResult && !aiLoading && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-3 bg-gray-50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI 변환 결과 검토</p>
          <div>
            <p className="text-xs text-gray-500 mb-1">학부모 노출 (순화본)</p>
            <p className="text-sm text-gray-900 bg-gray-100 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
              {aiResult.purified || '(없음)'}
            </p>
          </div>
          {aiResult.deleted_items.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <AlertTriangle size={11} className="text-yellow-400" /> 삭제된 항목
              </p>
              <ul className="text-xs text-yellow-300 space-y-0.5 pl-2">
                {aiResult.deleted_items.map((item, i) => <li key={i}>• {item}</li>)}
              </ul>
            </div>
          )}
          {aiResult.coach_history && (
            <div>
              <p className="text-xs text-gray-500 mb-1">코치 전달 교육 이력</p>
              <p className="text-sm text-blue-200 bg-blue-900/20 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                {aiResult.coach_history}
              </p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onPublish}
              disabled={publishing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition-colors"
            >
              <Check size={13} />{publishing ? '게시 중...' : '승인 및 학부모 노출'}
            </button>
            <button onClick={onCancelAi} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-400 transition-colors">
              취소
            </button>
          </div>
        </div>
      )}

      {entry.published && entry.ai_purified && (
        <div className="border-t border-gray-200 px-4 py-3 bg-green-50">
          <p className="text-xs text-green-600 mb-1">학부모에게 노출 중</p>
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-3">{entry.ai_purified}</p>
          {entry.ai_coach_history && (
            <p className="mt-2 flex items-center gap-1 text-xs text-blue-400">
              <ChevronRight size={11} />코치 교육 이력 포함됨
            </p>
          )}
        </div>
      )}
    </div>
  );
}
