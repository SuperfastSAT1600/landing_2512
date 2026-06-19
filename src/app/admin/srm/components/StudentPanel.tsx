'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronDown, ChevronUp, Copy, Eye, Check } from 'lucide-react';
import {
  PARTY_LABELS,
  PARTY_COLORS,
  CHANNEL_LABELS,
  CHANNEL_COLORS,
  RESOLUTION_LABELS,
  TRIGGER_BADGE_LABELS,
} from '@/app/admin/srm/comm-constants';
import { getAdminName } from '@/lib/admin-user';
import { AddForm } from './CommLog';
import type { CommEntry } from '@/app/api/admin/srm/communications/route';
import type { EventContext } from './CommLog';
import { CrmLinkSection } from './CrmLinkSection';
import { SrmCommCard } from './SrmCommCard';
import { EventIssueCard, type BaseIssue } from './EventIssueCard';
import { LifecycleTab } from './LifecycleTab';
import { STAGE_LABELS } from '@/app/admin/srm/lifecycle-constants';
import type { LifecycleResponse } from '@/app/api/admin/srm/lifecycle/route';
import type { V2Summary } from '@/app/api/admin/srm/student/[profileId]/v2-summary/route';
import type { StudentIssue } from '@/app/api/admin/srm/student-issues/route';
import { PortalAccessToggle } from '@/app/admin/components/PortalAccessToggle';

const TRIGGER_LABELS: Record<string, string> = {
  no_show: '미접속 알림',
  late: '지각 알림',
  no_class: '수업 미잡힘 알림',
  no_study_hall: '스터디홀 미세팅 알림',
};

interface ConsultationEntry {
  id: string;
  created_at: string;
  raw_memo: string;
  author?: string;
}

interface CrmStudentDetail {
  id: string;
  name: string;
  grade: string | null;
  consultation_timeline: ConsultationEntry[];
  sfv2_profile_id: string | null;
  previous_rw_score: number | null;
  previous_math_score: number | null;
  target_score: number | null;
  target_test_date: string | null;
  school_type: string | null;
  desired_subjects: string | null;
  ot_datetime: string | null;
  parent_timezone: string | null;
  comm_language?: string | null;
  portal_token?: string | null;
}

interface DiagnosticResult {
  submitted_at: string;
  previous_rw_score: number | null;
  previous_math_score: number | null;
}

interface StudentDetail {
  profile: { id: string; full_name: string; email: string | null; phone: string | null; grade: string | null } | null;
  crmStudent: CrmStudentDetail | null;
  diagnostic?: DiagnosticResult | null;
  hasSummerProgram?: boolean;
}

type UnifiedEntry =
  | { source: 'crm'; id: string; created_at: string; raw_memo: string; author?: string | null }
  | { source: 'srm'; id: string; created_at: string; channel: string; target: string; parties?: string[]; content: string; author?: string | null; trigger_type?: string | null; resolution?: string | null; reason?: string | null };

function InfoRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-gray-500 w-14 shrink-0">{label}</span>
      <span className={`${small ? 'text-xs' : 'text-sm'} text-gray-600 break-all`}>{value}</span>
    </div>
  );
}

function sessionStatusLabel(status: string): string {
  switch (status) {
    case 'completed': return '완료';
    case 'cancelled': return '취소';
    case 'proposed': return '예정';
    case 'approved': return '확정';
    default: return status;
  }
}

function sessionStatusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-emerald-700';
    case 'cancelled': return 'text-red-700';
    case 'proposed': return 'text-gray-500';
    case 'approved': return 'text-blue-700';
    default: return 'text-gray-500';
  }
}

interface PauseRecord {
  id: string;
  pause_start: string;
  pause_until: string | null;
  reason: string | null;
  created_by: string | null;
}

interface Props {
  studentId?: string;
  crmStudentId?: string;
  studentName: string;
  onClose: () => void;
  triggerType?: string;
  eventId?: string;
  eventTime?: string;
  eventType?: 'coachRoom' | 'studyHall';
  coachId?: string;
  onLanguageChange?: (sfv2ProfileId: string, lang: 'ko' | 'en') => void;
}

export function StudentPanel({ studentId, crmStudentId, studentName, onClose, triggerType, eventId, eventTime, eventType, coachId, onLanguageChange }: Props) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [comms, setComms] = useState<CommEntry[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingComms, setLoadingComms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lifecycleData, setLifecycleData] = useState<LifecycleResponse | null>(null);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [briefing, setBriefing] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [v2Summary, setV2Summary] = useState<V2Summary | null>(null);
  const [loadingV2, setLoadingV2] = useState(false);
  const [commLang, setCommLang] = useState<'ko' | 'en'>('ko');
  const [langSaving, setLangSaving] = useState(false);
  const [portalIssuing, setPortalIssuing] = useState(false);
  const [portalCopied, setPortalCopied] = useState(false);
  const [localPortalToken, setLocalPortalToken] = useState<string | null>(null);
  const [coachLinkCopied, setCoachLinkCopied] = useState(false);
  const [activePause, setActivePause] = useState<PauseRecord | null | undefined>(undefined); // undefined = 아직 로딩
  const [pauseFormOpen, setPauseFormOpen] = useState(false);
  const [pauseUntil, setPauseUntil] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [pauseSaving, setPauseSaving] = useState(false);
  const [issues, setIssues] = useState<StudentIssue[]>([]);
  const [issueType, setIssueType] = useState('schedule_pending');
  const [customIssueType, setCustomIssueType] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issueSaving, setIssueSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'issue' | 'comm'>('comm');

  const commKey = studentId ?? crmStudentId ?? '';

  const fetchDetail = useCallback(async () => {
    setLoadingDetail(true);
    try {
      if (studentId) {
        const res = await srmFetch(`/api/admin/srm/student/${studentId}`);
        if (res.ok) setDetail(await res.json());
      } else if (crmStudentId) {
        const res = await srmFetch(`/api/admin/srm/student/crm/${crmStudentId}`);
        if (res.ok) {
          setDetail(await res.json());
        } else {
          setDetail({ profile: null, crmStudent: null });
        }
      }
    } catch {
      setDetail({ profile: null, crmStudent: null });
    } finally {
      setLoadingDetail(false);
    }
  }, [studentId, crmStudentId]);

  const fetchComms = useCallback(async () => {
    setLoadingComms(true);
    try {
      const res = await srmFetch(`/api/admin/srm/communications?studentId=${commKey}`);
      if (res.ok) setComms(await res.json());
    } catch {
      // silent
    } finally {
      setLoadingComms(false);
    }
  }, [commKey]);

  const fetchLifecycle = useCallback(async () => {
    const resolvedStudentId = crmStudentId;
    if (!studentId && !resolvedStudentId) return;
    const qp = resolvedStudentId ? `studentId=${resolvedStudentId}` : `profileId=${studentId}`;
    const res = await srmFetch(`/api/admin/srm/lifecycle?${qp}`);
    if (res.ok) setLifecycleData(await res.json());
  }, [studentId, crmStudentId]);

  const fetchV2Summary = useCallback(async () => {
    if (!studentId) return;
    setLoadingV2(true);
    try {
      const res = await srmFetch(`/api/admin/srm/student/${studentId}/v2-summary`);
      if (res.ok) setV2Summary(await res.json());
    } catch {
      // silent fail — v2 데이터 없음으로 처리
    }
    setLoadingV2(false);
  }, [studentId]);

  const fetchIssues = useCallback(async () => {
    const param = studentId
      ? `sfv2ProfileId=${studentId}`
      : crmStudentId
      ? `studentId=${crmStudentId}`
      : null;
    if (!param) return;
    const res = await srmFetch(`/api/admin/srm/student-issues?${param}`);
    if (res.ok) setIssues(await res.json());
  }, [studentId, crmStudentId]);

  const fetchPause = useCallback(async () => {
    const url = studentId
      ? `/api/admin/srm/student/${studentId}/pause`
      : crmStudentId
      ? `/api/admin/srm/student/crm/${crmStudentId}/pause`
      : null;
    if (!url) { setActivePause(null); return; }
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json() as { pause: PauseRecord | null };
        setActivePause(json.pause);
      } else {
        setActivePause(null);
      }
    } catch {
      setActivePause(null);
    }
  }, [studentId, crmStudentId]);

  useEffect(() => {
    fetchDetail();
    fetchComms();
    fetchLifecycle();
    fetchV2Summary();
    fetchPause();
    fetchIssues();
  }, [fetchDetail, fetchComms, fetchLifecycle, fetchV2Summary, fetchPause, fetchIssues]);

  const handlePauseCreate = async () => {
    setPauseSaving(true);
    const url = studentId
      ? `/api/admin/srm/student/${studentId}/pause`
      : `/api/admin/srm/student/crm/${crmStudentId}/pause`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pause_until: pauseUntil || null,
          reason: pauseReason || null,
          created_by: getAdminName() || '관리자',
        }),
      });
      await fetchPause();
      setPauseFormOpen(false);
      setPauseUntil('');
      setPauseReason('');
    } finally {
      setPauseSaving(false);
    }
  };

  const handlePauseEnd = async () => {
    setPauseSaving(true);
    const url = studentId
      ? `/api/admin/srm/student/${studentId}/pause/active`
      : `/api/admin/srm/student/crm/${crmStudentId}/pause/active`;
    try {
      await fetch(url, { method: 'DELETE' });
      await fetchPause();
    } finally {
      setPauseSaving(false);
    }
  };

  useEffect(() => {
    const lang = (detail?.crmStudent as unknown as { comm_language?: string | null } | null)?.comm_language;
    setCommLang(lang === 'en' ? 'en' : 'ko');
  }, [detail]);

  const handleLangToggle = async (lang: 'ko' | 'en') => {
    if (langSaving || lang === commLang) return;
    setCommLang(lang);
    setLangSaving(true);
    const resolvedId = crmStudentId ?? detail?.crmStudent?.id;
    try {
      if (studentId) {
        await srmFetch(`/api/admin/srm/student/${studentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comm_language: lang }),
        });
        onLanguageChange?.(studentId, lang);
      } else if (resolvedId) {
        await srmFetch(`/api/admin/srm/student/crm/${resolvedId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comm_language: lang }),
        });
      }
    } catch {
      setCommLang(lang === 'en' ? 'ko' : 'en');
    }
    setLangSaving(false);
  };

  const handleAdd = async (data: { parties: string[]; channel: string; content: string; reason?: string; resolution?: string }) => {
    setSaving(true);
    await srmFetch('/api/admin/srm/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: commKey,
        studentName,
        author: getAdminName(),
        triggerType: triggerType ?? 'manual',
        autoCount: 0,
        eventId: eventId ?? null,
        coachId: coachId ?? null,
        ...data,
      }),
    });
    await fetchComms();
    setSaving(false);
  };

  const handleCommUpdated = (updated: CommEntry) => {
    setComms((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  };

  const handleLinked = () => fetchDetail();

  const handleIssueSubmit = async () => {
    if (!issueTitle) return;
    if (issueType === 'custom' && !customIssueType.trim()) return;
    setIssueSaving(true);
    const resolvedIssueType = issueType === 'custom' && customIssueType.trim()
      ? customIssueType.trim()
      : issueType;
    await srmFetch('/api/admin/srm/student-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sfv2ProfileId: studentId ?? null,
        studentId: crmStudentId ?? null,
        studentName,
        issueType: resolvedIssueType,
        title: issueTitle,
        description: issueDesc || null,
        createdBy: getAdminName() || '관리자',
      }),
    });
    await fetchIssues();
    setIssueTitle('');
    setIssueDesc('');
    setCustomIssueType('');
    setIssueSaving(false);
  };

  const handleCopyCoachLink = async () => {
    if (!resolvedCrmStudentId) return;
    await navigator.clipboard.writeText(`${window.location.origin}/coach-prep/${resolvedCrmStudentId}`);
    setCoachLinkCopied(true);
    setTimeout(() => setCoachLinkCopied(false), 2500);
  };

  const handleGenerateBrief = async () => {
    if (!resolvedCrmStudentId) return;
    setBriefing('loading');
    const res = await srmFetch(`/api/admin/srm/student/crm/${resolvedCrmStudentId}/coach-brief`, {
      method: 'POST',
      headers: { 'x-admin-key': localStorage.getItem('admin_key') ?? '' },
    });
    setBriefing(res.ok ? 'done' : 'error');
  };

  const portalToken = localPortalToken ?? detail?.crmStudent?.portal_token ?? null;

  const handleIssuePortal = async () => {
    if (!resolvedCrmStudentId || portalIssuing || portalToken) return;
    setPortalIssuing(true);
    try {
      const res = await fetch(`/api/crm/students/${resolvedCrmStudentId}/portal-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': localStorage.getItem('admin_key') ?? '' },
      });
      if (!res.ok) throw new Error('failed');
      const { portal_token } = await res.json();
      setLocalPortalToken(portal_token);
    } catch {
      alert('포털 발급에 실패했습니다.');
    } finally {
      setPortalIssuing(false);
    }
  };

  const handlePreviewPortal = () => {
    if (!portalToken) return;
    const newWindow = window.open('', '_blank');
    if (newWindow) newWindow.location.href = `${window.location.origin}/portal/${portalToken}?preview=admin`;
  };

  const handleCopyPortalLink = async () => {
    if (!portalToken) return;
    await navigator.clipboard.writeText(`${window.location.origin}/portal/${portalToken}`);
    setPortalCopied(true);
    setTimeout(() => setPortalCopied(false), 2500);
  };

  const timeline: ConsultationEntry[] = detail?.crmStudent?.consultation_timeline ?? [];
  const isLinked = !!detail?.crmStudent;
  const resolvedCrmStudentId = crmStudentId ?? detail?.crmStudent?.id;

  const currentStageLabel = lifecycleData?.current?.stage
    ? (STAGE_LABELS[lifecycleData.current.stage] ?? null)
    : null;

  const triggerContext = triggerType && triggerType !== 'manual'
    ? { type: triggerType, label: TRIGGER_LABELS[triggerType] ?? triggerType }
    : undefined;

  const eventContext: EventContext | undefined = eventId && eventTime && eventType
    ? { eventId, time: eventTime, type: eventType }
    : undefined;

  // 통합 타임라인 정렬
  const unified: UnifiedEntry[] = [
    ...timeline.map((e) => ({ source: 'crm' as const, ...e })),
    ...comms.map((e) => ({ source: 'srm' as const, ...e })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-[900px] bg-white border-l border-gray-200 z-40 flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-gray-900">{studentName}</h2>
              {!loadingDetail && (
                <>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 border ${
                    detail?.profile
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-gray-50 text-gray-400 border-gray-200'
                  }`}>
                    {detail?.profile ? 'v2 연결' : 'v2 미연결'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 border ${
                    isLinked
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-gray-50 text-gray-400 border-gray-200'
                  }`}>
                    {isLinked ? 'CRM 연결' : 'CRM 미연결'}
                  </span>
                </>
              )}
              {detail?.hasSummerProgram && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium shrink-0">여름특강</span>
              )}
              {currentStageLabel && (
                <button
                  onClick={() => setLifecycleOpen((v) => !v)}
                  className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 border border-blue-200 rounded-full text-[11px] text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  {currentStageLabel}
                  {lifecycleOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              )}
            </div>
            {loadingDetail && (
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mt-1" />
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* 라이프사이클 accordion */}
        {lifecycleOpen && (
          <div className="border-b border-gray-200 px-5 py-4 bg-gray-50 max-h-80 overflow-y-auto shrink-0">
            <LifecycleTab
              profileId={studentId ?? ''}
              studentId={resolvedCrmStudentId}
            />
          </div>
        )}

        {/* 2컬럼 본문 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 왼쪽: 학생정보 + v2 학습이력 */}
          <div className="w-[340px] border-r border-gray-200 flex flex-col overflow-y-auto">
            {/* 학생 기본정보 */}
            <div className="px-4 py-3 bg-gray-50">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">학생 정보</p>
              {loadingDetail ? (
                <div className="space-y-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-3 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* 기본 프로필 */}
                  {(detail?.profile?.grade ?? detail?.crmStudent?.grade) && (
                    <InfoRow label="학년" value={detail?.profile?.grade ?? detail?.crmStudent?.grade ?? ''} />
                  )}
                  {detail?.profile?.email && (
                    <InfoRow label="이메일" value={detail.profile.email} small />
                  )}
                  {detail?.profile?.phone && (
                    <InfoRow label="전화" value={detail.profile.phone} />
                  )}
                  {detail?.crmStudent?.school_type && (
                    <InfoRow label="학교유형" value={detail.crmStudent.school_type} />
                  )}
                  {detail?.crmStudent?.desired_subjects && (
                    <InfoRow label="과목" value={detail.crmStudent.desired_subjects} />
                  )}
                  {detail?.crmStudent?.parent_timezone && (
                    <InfoRow label="타임존" value={detail.crmStudent.parent_timezone} />
                  )}

                  {/* 점수 */}
                  {(detail?.crmStudent?.previous_rw_score || detail?.crmStudent?.previous_math_score) && (
                    <div className="pt-1.5 border-t border-gray-100 mt-1.5">
                      <p className="text-[11px] text-gray-500 mb-1">현재 점수</p>
                      <div className="flex gap-3">
                        {detail.crmStudent.previous_rw_score != null && (
                          <div className="text-center">
                            <p className="text-[11px] text-gray-500">RW</p>
                            <p className="text-sm font-semibold text-gray-800">{detail.crmStudent.previous_rw_score}</p>
                          </div>
                        )}
                        {detail.crmStudent.previous_math_score != null && (
                          <div className="text-center">
                            <p className="text-[11px] text-gray-500">Math</p>
                            <p className="text-sm font-semibold text-gray-800">{detail.crmStudent.previous_math_score}</p>
                          </div>
                        )}
                        {detail.crmStudent.previous_rw_score != null && detail.crmStudent.previous_math_score != null && (
                          <div className="text-center">
                            <p className="text-[11px] text-gray-500">합계</p>
                            <p className="text-sm font-semibold text-blue-700">
                              {detail.crmStudent.previous_rw_score + detail.crmStudent.previous_math_score}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {detail?.crmStudent?.target_score && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-500 w-14 shrink-0">목표</span>
                      <span className="text-sm font-semibold text-emerald-600">{detail.crmStudent.target_score}</span>
                      {detail.crmStudent.target_test_date && (
                        <span className="text-[11px] text-gray-500">
                          ({new Date(detail.crmStudent.target_test_date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })})
                        </span>
                      )}
                    </div>
                  )}

                  {/* 진단 결과 */}
                  {detail?.diagnostic && (
                    <div className="pt-1.5 border-t border-gray-100 mt-1.5">
                      <p className="text-[11px] text-gray-500 mb-1">
                        진단 리포트 · {new Date(detail.diagnostic.submitted_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                      </p>
                      <div className="flex gap-3">
                        {detail.diagnostic.previous_rw_score != null && (
                          <div className="text-center">
                            <p className="text-[11px] text-gray-500">RW</p>
                            <p className="text-sm font-semibold text-gray-800">{detail.diagnostic.previous_rw_score}</p>
                          </div>
                        )}
                        {detail.diagnostic.previous_math_score != null && (
                          <div className="text-center">
                            <p className="text-[11px] text-gray-500">Math</p>
                            <p className="text-sm font-semibold text-gray-800">{detail.diagnostic.previous_math_score}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OT 일시 */}
                  {detail?.crmStudent?.ot_datetime && (
                    <div className="flex items-baseline gap-2 pt-1.5 border-t border-gray-100 mt-1.5">
                      <span className="text-xs text-gray-500 w-14 shrink-0">OT</span>
                      <span className="text-xs text-gray-500">
                        {new Date(detail.crmStudent.ot_datetime).toLocaleDateString('ko-KR', {
                          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {/* 소통 언어 */}
                  <div className="flex items-center gap-2 pt-1.5 border-t border-gray-100 mt-1.5">
                    <span className="text-xs text-gray-500 w-14 shrink-0">소통언어</span>
                    <div className="flex rounded-md overflow-hidden border border-gray-200">
                      {(['ko', 'en'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => handleLangToggle(lang)}
                          disabled={langSaving}
                          className={`px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                            commLang === lang
                              ? lang === 'en'
                                ? 'bg-blue-500 text-gray-900'
                                : 'bg-gray-100 text-gray-900'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {lang.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CRM 연결 상태 + 학부모 포털 */}
                  <div className="flex items-center gap-2 pt-1.5 border-t border-gray-100 mt-1.5">
                    {isLinked ? (
                      <span className="text-[11px] px-2 py-0.5 bg-emerald-100 border border-emerald-200 rounded-full text-emerald-700">
                        CRM 연결됨
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-full text-gray-500">
                        CRM 미연결
                      </span>
                    )}
                    {isLinked && resolvedCrmStudentId && (
                      <PortalAccessToggle
                        hasPortal={!!portalToken}
                        issuing={portalIssuing}
                        copied={portalCopied}
                        theme="dark"
                        onToggle={handleIssuePortal}
                        onCopy={handleCopyPortalLink}
                        onPreview={handlePreviewPortal}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* 코치 포털 */}
              {resolvedCrmStudentId && (
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <span className={`text-[11px] font-medium ${
                    briefing === 'done' ? 'text-blue-500' : 'text-gray-500'
                  }`}>코치 포털</span>

                  {/* 생성 토글 = AI 브리핑 */}
                  <button
                    onClick={briefing !== 'loading' ? handleGenerateBrief : undefined}
                    disabled={briefing === 'loading'}
                    aria-label={briefing === 'done' ? '브리핑 생성됨 (클릭하여 재생성)' : '브리핑 생성하기'}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-50 ${
                      briefing === 'done'
                        ? 'bg-blue-500'
                        : briefing === 'error'
                        ? 'bg-red-300 hover:bg-red-400 cursor-pointer'
                        : 'bg-gray-200 hover:bg-gray-300 cursor-pointer'
                    }`}
                  >
                    {briefing === 'loading' ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                      </span>
                    ) : (
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        briefing === 'done' ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    )}
                  </button>

                  {/* 미리보기 */}
                  <a
                    href={`/coach-prep/${resolvedCrmStudentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <Eye size={11} />
                    미리보기
                  </a>

                  {/* 포털 링크 복사 */}
                  <button
                    onClick={handleCopyCoachLink}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    {coachLinkCopied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                    포털 링크
                  </button>
                </div>
              )}
            </div>

            {/* v2 학습이력 */}
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">v2 학습 이력</p>

              {loadingV2 ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : !v2Summary ? (
                <p className="text-xs text-gray-500">v2 데이터 없음</p>
              ) : (
                <div className="space-y-3">
                  {/* 최근 수업 */}
                  {v2Summary.recentSessions.length > 0 && (
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1">최근 수업</p>
                      <div className="space-y-0.5">
                        {v2Summary.recentSessions.slice(0, 3).map((s) => (
                          <div key={s.id} className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {new Date(s.starts_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                            </span>
                            <span className={`text-[11px] font-medium ${sessionStatusColor(s.status)}`}>
                              {sessionStatusLabel(s.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 스터디홀 */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">스터디홀</span>
                    <span className="text-xs text-gray-600">
                      최근 30일 {v2Summary.studyHallCount30d}회
                    </span>
                  </div>

                  {/* 시험 점수 */}
                  {v2Summary.testScores.length > 0 && (
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1">시험 점수</p>
                      <div className="space-y-0.5">
                        {v2Summary.testScores.slice(0, 2).map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {new Date(t.submitted_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                            </span>
                            <span className="text-xs text-gray-600 font-medium">
                              {t.score} / {t.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 잔여 세션 */}
                  {v2Summary.package?.remaining_sessions != null && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-[11px] text-gray-500">잔여 세션</span>
                      <span className="text-xs text-gray-600 font-medium">
                        {v2Summary.package.remaining_sessions}
                        {v2Summary.package.total_sessions != null ? ` / ${v2Summary.package.total_sessions}` : ''}회
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 휴원 섹션 */}
            {activePause !== undefined && (
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">휴원</p>
                  {activePause ? (
                    <button
                      onClick={handlePauseEnd}
                      disabled={pauseSaving}
                      className="text-[11px] text-red-700 hover:text-red-700 disabled:opacity-40"
                    >
                      {pauseSaving ? '처리중...' : '휴원 해제'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setPauseFormOpen((v) => !v)}
                      className="text-[11px] text-blue-700 hover:text-blue-700"
                    >
                      {pauseFormOpen ? '취소' : '휴원 설정'}
                    </button>
                  )}
                </div>

                {activePause ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">휴원 중</span>
                      {activePause.pause_until && (
                        <span className="text-[11px] text-gray-500">
                          ~ {new Date(activePause.pause_until).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} 재개 예정
                        </span>
                      )}
                      {!activePause.pause_until && (
                        <span className="text-[11px] text-gray-500">재개일 미정</span>
                      )}
                    </div>
                    {activePause.reason && (
                      <p className="text-[11px] text-gray-500">{activePause.reason}</p>
                    )}
                  </div>
                ) : pauseFormOpen ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-0.5">재개 예정일 (선택)</label>
                      <input
                        type="date"
                        value={pauseUntil}
                        onChange={(e) => setPauseUntil(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-0.5">사유 (선택)</label>
                      <input
                        type="text"
                        value={pauseReason}
                        onChange={(e) => setPauseReason(e.target.value)}
                        placeholder="해외 여행, 시험 기간 등"
                        className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                    <button
                      onClick={handlePauseCreate}
                      disabled={pauseSaving}
                      className="w-full text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded px-3 py-1.5 disabled:opacity-40"
                    >
                      {pauseSaving ? '저장중...' : '휴원 시작'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">현재 수업 중</p>
                )}
              </div>
            )}

            {/* CRM 연결 섹션 (미연결 시) */}
            {!loadingDetail && !isLinked && studentId && (
              <div className="px-4 py-3 border-t border-gray-100">
                <CrmLinkSection sfv2ProfileId={studentId} onLinked={handleLinked} />
              </div>
            )}
            {!loadingDetail && !isLinked && !studentId && (
              <div className="px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">v2 계정과 연결하려면 연결 탭을 이용하세요.</p>
              </div>
            )}
          </div>

          {/* 오른쪽: 이슈 / 커뮤니케이션 탭 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 탭 헤더 */}
            <div className="flex border-b border-gray-200 shrink-0">
              <button
                onClick={() => setActiveTab('issue')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'issue'
                    ? 'border-orange-500 text-orange-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                이슈
                {issues.filter((i) => i.status === 'open').length > 0 && (
                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] border border-orange-200">
                    {issues.filter((i) => i.status === 'open').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('comm')}
                className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'comm'
                    ? 'border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                커뮤니케이션
              </button>
            </div>

            {/* 이슈 탭 */}
            {activeTab === 'issue' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                  {issues.length === 0 && (
                    <p className="text-xs text-gray-400">등록된 이슈 없음</p>
                  )}
                  {issues.map((issue) => (
                    <EventIssueCard
                      key={issue.id}
                      issue={issue as BaseIssue}
                      onUpdated={(updated) =>
                        setIssues((prev) =>
                          prev.map((i) => (i.id === updated.id ? (updated as StudentIssue) : i)),
                        )
                      }
                      onDeleted={(id) => setIssues((prev) => prev.filter((i) => i.id !== id))}
                      apiBase="/api/admin/srm/student-issues"
                    />
                  ))}
                </div>
                <div className="border-t border-gray-100 px-4 py-3 shrink-0 space-y-2">
                  <select
                    value={issueType}
                    onChange={(e) => { setIssueType(e.target.value); setCustomIssueType(''); }}
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="schedule_pending">스케줄 조율 중</option>
                    <option value="coach_pending">코치 배정 중</option>
                    <option value="renewal_needed">재결제 필요</option>
                    <option value="custom">기타</option>
                  </select>
                  {issueType === 'custom' && (
                    <input
                      type="text"
                      value={customIssueType}
                      onChange={(e) => setCustomIssueType(e.target.value)}
                      placeholder="유형 직접 입력 (예: 퇴원, 환불 요청)"
                      className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                    />
                  )}
                  <input
                    type="text"
                    value={issueTitle}
                    onChange={(e) => setIssueTitle(e.target.value)}
                    placeholder="이슈 제목"
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                  />
                  <textarea
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                    placeholder="메모 (선택)"
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-500/50 resize-none"
                  />
                  <button
                    onClick={handleIssueSubmit}
                    disabled={issueSaving || !issueTitle || (issueType === 'custom' && !customIssueType.trim())}
                    className="w-full text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded px-3 py-1.5 disabled:opacity-40"
                  >
                    {issueSaving ? '저장중...' : '이슈 등록'}
                  </button>
                </div>
              </div>
            )}

            {/* 커뮤니케이션 탭 */}
            {activeTab === 'comm' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {(loadingDetail || loadingComms) ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : unified.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">기록된 내용이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {unified.map((entry) => {
                        if (entry.source === 'crm') {
                          return (
                            <div key={`crm-${entry.id}`} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  상담
                                </span>
                                <span className="text-[11px] text-gray-500 ml-auto">
                                  {new Date(entry.created_at).toLocaleDateString('ko-KR', {
                                    year: 'numeric', month: 'numeric', day: 'numeric',
                                  })}
                                  {entry.author ? ` · ${entry.author}` : ''}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {entry.raw_memo}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <SrmCommCard
                            key={`srm-${entry.id}`}
                            entry={entry as unknown as CommEntry}
                            onUpdated={handleCommUpdated}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-100 px-4 py-3 shrink-0">
                  <AddForm onSave={handleAdd} saving={saving} triggerContext={triggerContext} eventContext={eventContext} noBorder />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
