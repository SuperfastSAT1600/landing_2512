'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronDown, Sparkles, Check, Clock, AlertTriangle, RefreshCw, UserX, Pencil, Link, Copy } from 'lucide-react';
import type { Student, ConsultationEntry, FunnelStage, LeadStatus, ChurnType } from '@/types/crm';
import {
  FUNNEL_STAGE_LABELS, SCHOOL_TYPE_LABELS, CONTACT_TYPE_LABELS, TIMEZONE_LABEL_MAP,
  GRADE_OPTIONS, INQUIRY_CHANNEL_OPTIONS, TRAFFIC_SOURCE_OPTIONS, CONTENT_AUTHOR_OPTIONS,
  B2B_PARTNER_OPTIONS, TIMEZONE_OPTIONS,
} from '@/types/crm';
import { ChurnModal } from './ChurnModal';

// ─── 퍼널 가이드 ──────────────────────────────────────────────────────────────

const SALES_STAGES_ONLY: FunnelStage[] = ['0', '1', '2', '3a', '3b', '4', '5a', '5b', '6', '7'];


// ─── 편집 폼 ──────────────────────────────────────────────────────────────────

interface EditForm {
  name: string; grade: string; school_type: string; contact_type: string;
  parent_phone: string; parent_timezone: string; desired_subjects: string;
  previous_score_status: string; previous_rw_score: string; previous_math_score: string;
  target_score: string; target_test_date: string; target_test_date_2: string;
  inquiry_date: string; inquiry_channel: string; traffic_source: string;
  content_author: string; lead_type: string; b2b_partner: string;
  preferred_language: string;
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
    preferred_language: s.preferred_language ?? '',
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface StudentDetailPanelProps {
  student: Student;
  adminKey: string;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Student>) => void;
  onDelete?: (id: string) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StudentDetailPanel({ student, adminKey, onClose, onUpdate, onDelete }: StudentDetailPanelProps) {
  const [memoText, setMemoText] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const [memoError, setMemoError] = useState('');
  const [aiLoadingFor, setAiLoadingFor] = useState<string | null>(null);
  const [pendingEdits, setPendingEdits] = useState<Record<string, {
    purified: string; coachHistory: string; deletedItems: string[];
  }>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [timeline, setTimeline] = useState<ConsultationEntry[]>(student.consultation_timeline ?? []);
  const [localStudent, setLocalStudent] = useState<Student>(student);
  const [loadingFresh, setLoadingFresh] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(studentToEditForm(student));
  const [savingEdit, setSavingEdit] = useState(false);
  const [funnelChanging, setFunnelChanging] = useState(false);
  const [showFunnelMenu, setShowFunnelMenu] = useState(false);
  const [showChurnModal, setShowChurnModal] = useState(false);
  const [showReactivateForm, setShowReactivateForm] = useState(false);
  const [reactivateStrategy, setReactivateStrategy] = useState('');
  const [reactivating, setReactivating] = useState(false);
  const [portalCopied, setPortalCopied] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showInquiry, setShowInquiry] = useState(false);

  interface DiagCandidate { id: string; student_name: string; student_email: string; submitted_at: string; test_id: string; total_time_seconds: number }
  const [diagLinked, setDiagLinked] = useState<DiagCandidate | null>(null);
  const [diagCandidates, setDiagCandidates] = useState<DiagCandidate[]>([]);
  const [showDiagPicker, setShowDiagPicker] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  async function fetchDiagLink() {
    setDiagLoading(true);
    const res = await fetch(`/api/crm/students/${student.id}/diagnostic-link`, { headers });
    if (res.ok) {
      const { linked, candidates } = await res.json();
      setDiagLinked(linked);
      setDiagCandidates(candidates);
    }
    setDiagLoading(false);
  }

  async function handleDiagLink(resultId: string | null) {
    setDiagLoading(true);
    await fetch(`/api/crm/students/${student.id}/diagnostic-link`, {
      method: 'POST', headers,
      body: JSON.stringify({ resultId }),
    });
    await fetchDiagLink();
    setShowDiagPicker(false);
    onUpdate(student.id, { diagnostic_result_id: resultId });
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchFresh() {
      try {
        const res = await fetch(`/api/crm/students/${student.id}`, {
          headers: { 'x-admin-key': adminKey },
        });
        const json = await res.json();
        if (!cancelled && res.ok && json.data) {
          const freshTimeline: ConsultationEntry[] = json.data.consultation_timeline ?? [];
          setLocalStudent(json.data);
          setTimeline(freshTimeline);
          setEditForm(studentToEditForm(json.data));
          const initialEdits: Record<string, { purified: string; coachHistory: string; deletedItems: string[] }> = {};
          freshTimeline.forEach(e => {
            if (e.ai_purified && !e.published) {
              initialEdits[e.id] = {
                purified: e.ai_purified,
                coachHistory: e.ai_coach_history ?? '',
                deletedItems: e.ai_deleted_items ?? [],
              };
            }
          });
          setPendingEdits(initialEdits);
        }
      } finally {
        if (!cancelled) setLoadingFresh(false);
      }
    }
    fetchFresh();
    return () => { cancelled = true; };
  }, [student.id, adminKey]);

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
        preferred_language: (editForm.preferred_language as Student['preferred_language']) || null,
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
        const newEntry: ConsultationEntry = json.data;
        setTimeline(prev => [newEntry, ...prev]);
        setMemoText('');
        onUpdate(student.id, { last_contacted_at: new Date().toISOString() });
        triggerAiCare(newEntry);
      } else {
        setMemoError(json.error?.message ?? '메모 저장에 실패했습니다.');
      }
    } catch {
      setMemoError('네트워크 오류가 발생했습니다.');
    } finally {
      setSavingMemo(false);
    }
  }

  async function triggerAiCare(entry: ConsultationEntry) {
    setAiLoadingFor(entry.id);
    try {
      const res = await fetch('/api/crm/ai-care', {
        method: 'POST', headers, body: JSON.stringify({ raw_memo: entry.raw_memo }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setPendingEdits(prev => ({
          ...prev,
          [entry.id]: {
            purified: json.data.purified,
            coachHistory: json.data.coach_history,
            deletedItems: json.data.deleted_items,
          },
        }));
      }
    } finally {
      setAiLoadingFor(null);
    }
  }

  async function handlePublish(entryId: string) {
    const edit = pendingEdits[entryId];
    if (!edit) return;
    setPublishing(true);
    setPublishError('');
    try {
      const res = await fetch(`/api/crm/students/${student.id}/publish-memo`, {
        method: 'POST', headers,
        body: JSON.stringify({
          entry_id: entryId, ai_purified: edit.purified,
          ai_deleted_items: edit.deletedItems, ai_coach_history: edit.coachHistory,
        }),
      });
      if (res.ok) {
        setTimeline(prev => prev.map(e =>
          e.id === entryId
            ? { ...e, ai_purified: edit.purified, ai_coach_history: edit.coachHistory, ai_deleted_items: edit.deletedItems, published: true }
            : e
        ));
        setPendingEdits(prev => {
          const next = { ...prev };
          delete next[entryId];
          return next;
        });
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

  async function handleCopyPortalLink() {
    setPortalLoading(true);
    try {
      const res = await fetch(`/api/crm/students/${student.id}/portal-token`, {
        method: 'POST', headers,
      });
      if (!res.ok) throw new Error('failed');
      const { portal_token } = await res.json();
      const url = `${window.location.origin}/portal/${portal_token}`;
      await navigator.clipboard.writeText(url);
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 2500);
    } catch {
      alert('포털 링크 생성에 실패했습니다.');
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`"${localStudent.name}" 리드를 완전히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/crm/students/${student.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('failed');
      onDelete?.(student.id);
      onClose();
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  }

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
        <div className="relative w-full max-w-[440px] bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden shadow-xl">

          {/* ── Header ── */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-[18px] font-bold text-gray-900 leading-tight">{localStudent.name}</h2>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  {localStudent.grade} · {SCHOOL_TYPE_LABELS[localStudent.school_type]} · {localStudent.desired_subjects}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                <button
                  onClick={handleCopyPortalLink}
                  disabled={portalLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                  title="학부모 포털 링크 복사"
                >
                  {portalCopied ? (
                    <Check size={12} className="text-green-500" />
                  ) : portalLoading ? (
                    <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Copy size={12} />
                  )}
                  {portalCopied ? '복사됨' : '포털'}
                </button>
                <button onClick={handleBackdropClick} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Status badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Funnel stage pill (clickable dropdown) */}
              <div className="relative">
                {showFunnelMenu && (
                  <div className="fixed inset-0 z-20" onClick={() => setShowFunnelMenu(false)} />
                )}
                <button
                  onClick={() => {
                    if (!funnelChanging && localStudent.lead_status !== 'inactive') {
                      setShowFunnelMenu(!showFunnelMenu);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    localStudent.lead_status === 'inactive'
                      ? 'bg-gray-100 text-gray-500 cursor-default'
                      : 'bg-blue-100 hover:bg-blue-200 text-blue-700 cursor-pointer'
                  }`}
                >
                  {funnelChanging ? (
                    <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {localStudent.funnel_stage === 'churned' ? '이탈' : localStudent.funnel_stage}. {FUNNEL_STAGE_LABELS[localStudent.funnel_stage]}
                      {localStudent.lead_status !== 'inactive' && <ChevronDown size={11} />}
                    </>
                  )}
                </button>

                {showFunnelMenu && !funnelChanging && (
                  <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1.5 min-w-[230px] overflow-hidden">
                    {SALES_STAGES_ONLY.map(stage => (
                      <button
                        key={stage}
                        onClick={() => { handleFunnelChange(stage); setShowFunnelMenu(false); }}
                        className={`w-full text-left px-4 py-2 text-[13px] hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                          stage === localStudent.funnel_stage ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-gray-700'
                        }`}
                      >
                        <span className="w-4 shrink-0">
                          {stage === localStudent.funnel_stage && <Check size={12} className="text-blue-500" />}
                        </span>
                        {stage}. {FUNNEL_STAGE_LABELS[stage]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lead status action buttons */}
              {localStudent.lead_status === 'active' && (
                <button
                  onClick={() => setShowChurnModal(true)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-full transition-colors"
                >
                  이탈 처리
                </button>
              )}

              {localStudent.lead_status === 'inactive' && !showReactivateForm && (
                <button
                  onClick={() => setShowReactivateForm(true)}
                  className="px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-full transition-colors"
                >
                  재활성화 시작
                </button>
              )}

              {localStudent.lead_status === 'reactivating' && (
                <>
                  <span className="px-3 py-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full">재활성화 중</span>
                  <button
                    onClick={() => handleLeadStatusChange('active', { funnel_stage: '1' })}
                    className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-full transition-colors"
                  >
                    활성화
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('재활성화 시도를 중단하고 이탈 확정하시겠습니까?')) {
                        handleLeadStatusChange('inactive');
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-200 rounded-full transition-colors"
                  >
                    이탈 확정
                  </button>
                </>
              )}
            </div>

            {/* Reactivation form (inline expansion) */}
            {localStudent.lead_status === 'inactive' && showReactivateForm && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
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
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* ── 학생 정보 (편집 가능) ── */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500" style={{ letterSpacing: '0.3px' }}>학생 정보</p>
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
                      className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {savingEdit ? '저장 중...' : '저장'}
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <StudentInfoEdit form={editForm} onChange={setEditForm} />
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <StudentInfoCell label="직전 점수" value={scoreDisplay()} />
                    <StudentInfoCell label="목표 점수" value={localStudent.target_score ? `${localStudent.target_score}점` : '미정'} />
                    <StudentInfoCell
                      label="목표 시험일"
                      value={localStudent.target_test_date
                        ? localStudent.target_test_date_2
                          ? `${localStudent.target_test_date} / ${localStudent.target_test_date_2}`
                          : localStudent.target_test_date
                        : '미정'}
                    />
                    {localStudent.preferred_language && (
                      <StudentInfoCell
                        label="수업 언어"
                        value={{ korean: '한국어', english: 'English', any: '상관없음' }[localStudent.preferred_language] ?? localStudent.preferred_language}
                      />
                    )}
                  </div>

                  {/* 진단테스트 연결 */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => { if (!showDiagPicker) fetchDiagLink(); setShowDiagPicker(!showDiagPicker); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[12px] transition-colors ${
                        diagLinked
                          ? 'border-green-200 text-green-600 bg-green-50 hover:bg-green-100'
                          : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      {diagLoading ? (
                        <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Link size={12} />
                      )}
                      {diagLinked ? '진단 결과 연결됨' : '진단테스트 연결'}
                    </button>
                  </div>

                  {showDiagPicker && (
                    <div className="mt-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-600">결과 선택</p>
                        <button onClick={() => setShowDiagPicker(false)} className="text-[11px] text-gray-400 hover:text-gray-600">닫기</button>
                      </div>
                      {diagLoading && (
                        <div className="py-4 flex justify-center">
                          <div className="w-4 h-4 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {!diagLoading && diagCandidates.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">연결 가능한 결과가 없습니다.</p>
                      )}
                      {!diagLoading && diagCandidates.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleDiagLink(c.id)}
                          className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${diagLinked?.id === c.id ? 'bg-green-50' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-gray-800">{c.student_name}</p>
                              <p className="text-[11px] text-gray-500">{c.student_email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] text-gray-500">
                                {new Date(c.submitted_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                              </p>
                              {diagLinked?.id === c.id && <p className="text-[10px] text-green-600 font-medium">현재 연결됨</p>}
                            </div>
                          </div>
                        </button>
                      ))}
                      {diagLinked && !diagLoading && (
                        <button
                          onClick={() => handleDiagLink(null)}
                          className="w-full text-left px-3 py-2 text-[11px] text-red-400 hover:bg-red-50 transition-colors border-t border-gray-100"
                        >
                          연결 해제
                        </button>
                      )}
                    </div>
                  )}

                  {localStudent.funnel_stage === '0' && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-400 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors"
                      >
                        <UserX size={12} />
                        {deleting ? '삭제 중...' : '잘못된 리드 삭제'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

{/* ── 상담 메모 ── */}
            <section>
              <p className="text-xs font-medium text-gray-500 mb-2" style={{ letterSpacing: '0.3px' }}>상담 메모</p>
              <textarea
                value={memoText}
                onChange={e => { setMemoText(e.target.value); setMemoError(''); }}
                placeholder="상담 내용을 입력하세요..."
                rows={3}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-y focus:outline-none focus:border-blue-400 min-h-[64px]"
              />
              {memoError && <p className="mt-1 text-xs text-red-500">{memoError}</p>}
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleAddMemo}
                  disabled={!memoText.trim() || savingMemo}
                  className="px-4 py-1.5 bg-gray-900 hover:bg-gray-700 disabled:opacity-40 rounded-lg text-[13px] font-semibold text-white transition-colors"
                >
                  {savingMemo ? '저장 중...' : '메모 저장'}
                </button>
              </div>
            </section>

            {/* ── 상담 타임라인 ── */}
            <section>
              <p className="text-xs font-medium text-gray-500 mb-2" style={{ letterSpacing: '0.3px' }}>
                상담 타임라인
                {!loadingFresh && timeline.length > 0 && (
                  <span className="text-gray-400 font-normal ml-1">({timeline.length}건)</span>
                )}
              </p>
              {loadingFresh && (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-gray-200 animate-pulse" />)}
                </div>
              )}
              {!loadingFresh && timeline.length === 0 && (
                <p className="text-sm text-gray-400">상담 메모가 없습니다.</p>
              )}
              {publishError && <p className="mb-2 text-xs text-red-500">{publishError}</p>}
              <div className="space-y-3">
                {timeline.map(entry => (
                  <TimelineEntry
                    key={entry.id}
                    entry={entry}
                    aiLoading={aiLoadingFor === entry.id}
                    pendingEdit={pendingEdits[entry.id] ?? null}
                    publishing={publishing}
                    onAiCare={() => triggerAiCare(entry)}
                    onPublish={() => handlePublish(entry.id)}
                    onCancelEdit={() => setPendingEdits(prev => {
                      const next = { ...prev };
                      delete next[entry.id];
                      return next;
                    })}
                    onChangePurified={v => setPendingEdits(prev =>
                      prev[entry.id] ? { ...prev, [entry.id]: { ...prev[entry.id], purified: v } } : prev
                    )}
                    onChangeCoachHistory={v => setPendingEdits(prev =>
                      prev[entry.id] ? { ...prev, [entry.id]: { ...prev[entry.id], coachHistory: v } } : prev
                    )}
                  />
                ))}
              </div>
            </section>

            {/* ── 인입 정보 (접힘) ── */}
            <section>
              <button
                onClick={() => setShowInquiry(v => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showInquiry ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                인입 정보
              </button>
              {showInquiry && (
                <div className="mt-2 bg-gray-100 rounded-xl px-4 py-3 space-y-1.5">
                  <InquiryRow label="문의일" value={localStudent.inquiry_date ?? '—'} />
                  <InquiryRow label="채널" value={localStudent.inquiry_channel ?? '(미상)'} />
                  <InquiryRow label="소스" value={localStudent.traffic_source ?? '(미상)'} />
                  {localStudent.content_author && (
                    <InquiryRow label="작성자" value={localStudent.content_author} />
                  )}
                  <InquiryRow label="구분" value={localStudent.lead_type ?? '—'} />
                  {localStudent.b2b_partner && (
                    <InquiryRow label="파트너" value={localStudent.b2b_partner} />
                  )}
                  <InquiryRow
                    label={localStudent.contact_type ? CONTACT_TYPE_LABELS[localStudent.contact_type] : '연락처'}
                    value={localStudent.parent_phone || '—'}
                  />
                  {localStudent.parent_timezone && (
                    <InquiryRow label="시간대" value={TIMEZONE_LABEL_MAP[localStudent.parent_timezone] ?? localStudent.parent_timezone} />
                  )}
                  {localStudent.campaign_tags && localStudent.campaign_tags.length > 0 && (
                    <div className="flex items-start gap-2 pt-0.5">
                      <span className="text-[13px] text-gray-400 w-[28%] shrink-0">태그</span>
                      <div className="flex flex-wrap gap-1">
                        {localStudent.campaign_tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[11px] font-medium">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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

// ─── InquiryRow ───────────────────────────────────────────────────────────────

function InquiryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[13px] text-gray-400 w-[28%] shrink-0">{label}</span>
      <span className="text-[13px] text-gray-700 font-medium">{value}</span>
    </div>
  );
}

// ─── StudentInfoCell ──────────────────────────────────────────────────────────

function StudentInfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className="text-[14px] text-gray-900 font-bold leading-snug">{value}</p>
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
      <EditField label="수업 희망 언어">
        <select value={form.preferred_language} onChange={set('preferred_language')} className={selectCls}>
          <option value="">(미설정)</option>
          <option value="korean">한국어</option>
          <option value="english">English</option>
          <option value="any">상관없음</option>
        </select>
      </EditField>
      <div className="pt-2 border-t border-gray-100">
        <p className="text-[11px] text-gray-400 font-medium mb-2">인입 정보 수정</p>
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
  aiLoading: boolean;
  pendingEdit: { purified: string; coachHistory: string; deletedItems: string[] } | null;
  publishing: boolean;
  onAiCare: () => void;
  onPublish: () => void;
  onCancelEdit: () => void;
  onChangePurified: (v: string) => void;
  onChangeCoachHistory: (v: string) => void;
}

function TimelineEntry({ entry, aiLoading, pendingEdit, publishing, onAiCare, onPublish, onCancelEdit, onChangePurified, onChangeCoachHistory }: TimelineEntryProps) {
  const date = new Date(entry.created_at).toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-gray-400">{date}</span>
          {entry.published && (
            <span className="flex items-center gap-1 text-[11px] text-green-500">
              <Check size={11} /> 학부모 노출
            </span>
          )}
        </div>
        <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap" style={{ lineHeight: '1.6' }}>
          {entry.raw_memo}
        </p>
        {!entry.published && !aiLoading && !pendingEdit && (
          <button onClick={onAiCare} className="mt-3 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-500 transition-colors">
            <Sparkles size={12} />AI 변환 재실행
          </button>
        )}
        {aiLoading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
            AI가 학부모용·코치용 버전을 생성 중입니다...
          </div>
        )}
      </div>

      {pendingEdit && !aiLoading && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">AI 변환 결과 — 수정 후 최종 승인</p>
          <div>
            <p className="text-[11px] text-gray-400 mb-1">학부모 노출 (순화본)</p>
            <textarea
              value={pendingEdit.purified}
              onChange={e => onChangePurified(e.target.value)}
              rows={4}
              className="w-full text-[13px] text-gray-900 bg-white border border-gray-200 focus:border-blue-400 rounded-lg px-3 py-2 leading-relaxed resize-none outline-none transition-colors"
            />
          </div>
          {pendingEdit.deletedItems.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
                <AlertTriangle size={11} className="text-yellow-500" /> 삭제된 항목 (참고용)
              </p>
              <ul className="text-xs text-yellow-600 space-y-0.5 pl-2">
                {pendingEdit.deletedItems.map((item, i) => <li key={i}>• {item}</li>)}
              </ul>
            </div>
          )}
          <div>
            <p className="text-[11px] text-gray-400 mb-1">코치 교육 이력</p>
            <textarea
              value={pendingEdit.coachHistory}
              onChange={e => onChangeCoachHistory(e.target.value)}
              rows={3}
              placeholder="(없음)"
              className="w-full text-[13px] text-blue-900 bg-blue-50 border border-blue-200 focus:border-blue-400 rounded-lg px-3 py-2 leading-relaxed resize-none outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onPublish}
              disabled={publishing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition-colors"
            >
              <Check size={12} />{publishing ? '게시 중...' : '최종 승인 및 발행'}
            </button>
            <button onClick={onCancelEdit} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-500 transition-colors">
              취소
            </button>
          </div>
        </div>
      )}

      {entry.published && entry.ai_purified && (
        <div className="border-t border-gray-100 px-4 py-3 bg-green-50">
          <p className="text-[11px] text-green-600 mb-1">학부모에게 노출 중</p>
          <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-3" style={{ lineHeight: '1.6' }}>
            {entry.ai_purified}
          </p>
          {entry.ai_coach_history && (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-blue-400">
              <ChevronRight size={11} />코치 교육 이력 포함됨
            </p>
          )}
        </div>
      )}
    </div>
  );
}
