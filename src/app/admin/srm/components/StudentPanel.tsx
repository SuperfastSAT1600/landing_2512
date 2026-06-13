'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronDown, ChevronUp, ExternalLink, Sparkles } from 'lucide-react';
import { AddForm } from './CommLog';
import type { CommEntry } from '@/app/api/admin/srm/communications/route';
import { CrmLinkSection } from './CrmLinkSection';
import { LifecycleTab } from './LifecycleTab';
import { STAGE_LABELS } from '@/app/admin/srm/lifecycle-constants';
import type { LifecycleResponse } from '@/app/api/admin/srm/lifecycle/route';
import type { V2Summary } from '@/app/api/admin/srm/student/[profileId]/v2-summary/route';

const TRIGGER_LABELS: Record<string, string> = {
  no_show: '미접속 알림',
  late: '지각 알림',
  no_class: '수업 미잡힘 알림',
  no_study_hall: '스터디홀 미세팅 알림',
};

const CHANNEL_LABELS: Record<string, string> = {
  kakao: '카카오',
  call: '전화',
  sms: 'SMS',
  email: '이메일',
  other: '기타',
};

const CHANNEL_COLORS: Record<string, string> = {
  kakao: 'bg-yellow-500/20 text-yellow-300',
  call: 'bg-blue-500/20 text-blue-300',
  sms: 'bg-green-500/20 text-green-300',
  email: 'bg-purple-500/20 text-purple-300',
  other: 'bg-gray-500/20 text-gray-300',
};

const RESOLUTION_LABELS: Record<string, string> = {
  scheduled: '일정잡음',
  will_contact: '다음연락',
  no_intent: '의향없음',
  unreachable: '연락불가',
  resolved: '해결됨',
  other: '기타',
};

const TRIGGER_BADGE_LABELS: Record<string, string> = {
  no_show: '미접속',
  late: '지각',
  no_class: '수업미잡힘',
  no_study_hall: '스터디홀미세팅',
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
}

type UnifiedEntry =
  | { source: 'crm'; id: string; created_at: string; raw_memo: string; author?: string | null }
  | { source: 'srm'; id: string; created_at: string; channel: string; target: string; content: string; author?: string | null; trigger_type?: string | null; resolution?: string | null; reason?: string | null };

function InfoRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-gray-500 w-14 shrink-0">{label}</span>
      <span className={`${small ? 'text-xs' : 'text-sm'} text-gray-300 break-all`}>{value}</span>
    </div>
  );
}

function getAdminName() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_user_name') ?? '';
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
    case 'completed': return 'text-emerald-400';
    case 'cancelled': return 'text-red-400';
    case 'proposed': return 'text-gray-400';
    case 'approved': return 'text-blue-400';
    default: return 'text-gray-500';
  }
}

interface Props {
  studentId?: string;
  crmStudentId?: string;
  studentName: string;
  onClose: () => void;
  triggerType?: string;
  eventId?: string;
  coachId?: string;
}

export function StudentPanel({ studentId, crmStudentId, studentName, onClose, triggerType, eventId, coachId }: Props) {
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

  const commKey = studentId ?? crmStudentId ?? '';

  const fetchDetail = useCallback(async () => {
    setLoadingDetail(true);
    if (studentId) {
      const res = await fetch(`/api/admin/srm/student/${studentId}`);
      setDetail(await res.json());
    } else if (crmStudentId) {
      const res = await fetch(`/api/admin/srm/student/crm/${crmStudentId}`);
      if (res.ok) {
        setDetail(await res.json());
      } else {
        setDetail({ profile: null, crmStudent: null });
      }
    }
    setLoadingDetail(false);
  }, [studentId, crmStudentId]);

  const fetchComms = useCallback(async () => {
    setLoadingComms(true);
    const res = await fetch(`/api/admin/srm/communications?studentId=${commKey}`);
    setComms(await res.json());
    setLoadingComms(false);
  }, [commKey]);

  const fetchLifecycle = useCallback(async () => {
    const resolvedStudentId = crmStudentId;
    if (!studentId && !resolvedStudentId) return;
    const qp = resolvedStudentId ? `studentId=${resolvedStudentId}` : `profileId=${studentId}`;
    const res = await fetch(`/api/admin/srm/lifecycle?${qp}`);
    if (res.ok) setLifecycleData(await res.json());
  }, [studentId, crmStudentId]);

  const fetchV2Summary = useCallback(async () => {
    if (!studentId) return;
    setLoadingV2(true);
    try {
      const res = await fetch(`/api/admin/srm/student/${studentId}/v2-summary`);
      if (res.ok) setV2Summary(await res.json());
    } catch {
      // silent fail — v2 데이터 없음으로 처리
    }
    setLoadingV2(false);
  }, [studentId]);

  useEffect(() => {
    fetchDetail();
    fetchComms();
    fetchLifecycle();
    fetchV2Summary();
  }, [fetchDetail, fetchComms, fetchLifecycle, fetchV2Summary]);

  const handleAdd = async (data: { target: string; channel: string; content: string; reason?: string; resolution?: string }) => {
    setSaving(true);
    await fetch('/api/admin/srm/communications', {
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

  const handleLinked = () => fetchDetail();

  const handleGenerateBrief = async () => {
    if (!resolvedCrmStudentId) return;
    setBriefing('loading');
    const res = await fetch(`/api/admin/srm/student/crm/${resolvedCrmStudentId}/coach-brief`, {
      method: 'POST',
      headers: { 'x-admin-key': localStorage.getItem('admin_key') ?? '' },
    });
    setBriefing(res.ok ? 'done' : 'error');
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

  // 통합 타임라인 정렬
  const unified: UnifiedEntry[] = [
    ...timeline.map((e) => ({ source: 'crm' as const, ...e })),
    ...comms.map((e) => ({ source: 'srm' as const, ...e })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-[900px] bg-[#1a1c1f] border-l border-white/10 z-40 flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">{studentName}</h2>
              {currentStageLabel && (
                <button
                  onClick={() => setLifecycleOpen((v) => !v)}
                  className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/15 border border-blue-500/25 rounded-full text-[11px] text-blue-300 hover:bg-blue-500/25 transition-colors"
                >
                  {currentStageLabel}
                  {lifecycleOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              )}
            </div>
            {loadingDetail && (
              <div className="h-3 w-24 bg-white/10 rounded animate-pulse mt-1" />
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* 라이프사이클 accordion */}
        {lifecycleOpen && (
          <div className="border-b border-white/10 px-5 py-4 bg-[#15171a] max-h-80 overflow-y-auto shrink-0">
            <LifecycleTab
              profileId={studentId ?? ''}
              studentId={resolvedCrmStudentId}
            />
          </div>
        )}

        {/* 2컬럼 본문 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 왼쪽: 학생정보 + v2 학습이력 */}
          <div className="w-[340px] border-r border-white/10 flex flex-col overflow-y-auto">
            {/* 학생 기본정보 */}
            <div className="px-4 py-3 bg-white/[0.03]">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">학생 정보</p>
              {loadingDetail ? (
                <div className="space-y-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-3 bg-white/10 rounded animate-pulse" />
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
                    <div className="pt-1.5 border-t border-white/10 mt-1.5">
                      <p className="text-[11px] text-gray-500 mb-1">현재 점수</p>
                      <div className="flex gap-3">
                        {detail.crmStudent.previous_rw_score != null && (
                          <div className="text-center">
                            <p className="text-[11px] text-gray-600">RW</p>
                            <p className="text-sm font-semibold text-gray-200">{detail.crmStudent.previous_rw_score}</p>
                          </div>
                        )}
                        {detail.crmStudent.previous_math_score != null && (
                          <div className="text-center">
                            <p className="text-[11px] text-gray-600">Math</p>
                            <p className="text-sm font-semibold text-gray-200">{detail.crmStudent.previous_math_score}</p>
                          </div>
                        )}
                        {detail.crmStudent.previous_rw_score != null && detail.crmStudent.previous_math_score != null && (
                          <div className="text-center">
                            <p className="text-[11px] text-gray-600">합계</p>
                            <p className="text-sm font-semibold text-blue-300">
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
                      <span className="text-sm font-semibold text-emerald-300">{detail.crmStudent.target_score}</span>
                      {detail.crmStudent.target_test_date && (
                        <span className="text-[11px] text-gray-600">
                          ({new Date(detail.crmStudent.target_test_date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })})
                        </span>
                      )}
                    </div>
                  )}

                  {/* 진단 결과 */}
                  {detail?.diagnostic && (
                    <div className="pt-1.5 border-t border-white/10 mt-1.5">
                      <p className="text-[11px] text-gray-500 mb-1">
                        진단 리포트 · {new Date(detail.diagnostic.submitted_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                      </p>
                      <div className="flex gap-3">
                        {detail.diagnostic.previous_rw_score != null && (
                          <div className="text-center">
                            <p className="text-[11px] text-gray-600">RW</p>
                            <p className="text-sm font-semibold text-gray-200">{detail.diagnostic.previous_rw_score}</p>
                          </div>
                        )}
                        {detail.diagnostic.previous_math_score != null && (
                          <div className="text-center">
                            <p className="text-[11px] text-gray-600">Math</p>
                            <p className="text-sm font-semibold text-gray-200">{detail.diagnostic.previous_math_score}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OT 일시 */}
                  {detail?.crmStudent?.ot_datetime && (
                    <div className="flex items-baseline gap-2 pt-1.5 border-t border-white/10 mt-1.5">
                      <span className="text-xs text-gray-500 w-14 shrink-0">OT</span>
                      <span className="text-xs text-gray-400">
                        {new Date(detail.crmStudent.ot_datetime).toLocaleDateString('ko-KR', {
                          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {/* CRM 연결 상태 */}
                  <div className="flex items-center gap-2 pt-1.5 border-t border-white/10 mt-1.5">
                    {isLinked ? (
                      <span className="text-[11px] px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/25 rounded-full text-emerald-400">
                        CRM 연결됨
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-gray-500">
                        CRM 미연결
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 코치 포털 + AI 브리핑 */}
              {resolvedCrmStudentId && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-500 truncate">
                      /coach-prep/{resolvedCrmStudentId.slice(0, 8)}…
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateBrief}
                    disabled={briefing === 'loading'}
                    title="AI 코치용 브리핑 생성"
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                      briefing === 'loading'
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                        : briefing === 'done'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : briefing === 'error'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30'
                    }`}
                  >
                    <Sparkles size={10} className={briefing === 'loading' ? 'animate-pulse' : ''} />
                    {briefing === 'loading' ? '생성 중…' : briefing === 'done' ? '완료' : briefing === 'error' ? '실패' : 'AI 브리핑'}
                  </button>
                  <a
                    href={`/coach-prep/${resolvedCrmStudentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="코치 포털 열기"
                    className="p-1 text-gray-500 hover:text-blue-400 transition-colors shrink-0"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* v2 학습이력 */}
            <div className="px-4 py-3 border-t border-white/10">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">v2 학습 이력</p>

              {loadingV2 ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-4 bg-white/10 rounded animate-pulse" />
                  ))}
                </div>
              ) : !v2Summary ? (
                <p className="text-xs text-gray-600">v2 데이터 없음</p>
              ) : (
                <div className="space-y-3">
                  {/* 최근 수업 */}
                  {v2Summary.recentSessions.length > 0 && (
                    <div>
                      <p className="text-[11px] text-gray-500 mb-1">최근 수업</p>
                      <div className="space-y-0.5">
                        {v2Summary.recentSessions.slice(0, 3).map((s) => (
                          <div key={s.id} className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
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
                    <span className="text-xs text-gray-300">
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
                            <span className="text-xs text-gray-400">
                              {new Date(t.submitted_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                            </span>
                            <span className="text-xs text-gray-300 font-medium">
                              {t.score} / {t.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 잔여 세션 */}
                  {v2Summary.package?.remaining_sessions != null && (
                    <div className="flex items-center justify-between pt-1 border-t border-white/10">
                      <span className="text-[11px] text-gray-500">잔여 세션</span>
                      <span className="text-xs text-gray-300 font-medium">
                        {v2Summary.package.remaining_sessions}
                        {v2Summary.package.total_sessions != null ? ` / ${v2Summary.package.total_sessions}` : ''}회
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CRM 연결 섹션 (미연결 시) */}
            {!loadingDetail && !isLinked && studentId && (
              <div className="px-4 py-3 border-t border-white/10">
                <CrmLinkSection sfv2ProfileId={studentId} onLinked={handleLinked} />
              </div>
            )}
            {!loadingDetail && !isLinked && !studentId && (
              <div className="px-4 py-3 border-t border-white/10">
                <p className="text-xs text-gray-500">v2 계정과 연결하려면 연결 탭을 이용하세요.</p>
              </div>
            )}
          </div>

          {/* 오른쪽: 통합 타임라인 + 입력폼 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 통합 타임라인 */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {(loadingDetail || loadingComms) ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : unified.length === 0 ? (
                <p className="text-xs text-gray-600 py-2">기록된 내용이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {unified.map((entry) => {
                    if (entry.source === 'crm') {
                      return (
                        <div key={`crm-${entry.id}`} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
                              상담
                            </span>
                            <span className="text-[11px] text-gray-600 ml-auto">
                              {new Date(entry.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric', month: 'numeric', day: 'numeric',
                              })}
                              {entry.author ? ` · ${entry.author}` : ''}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {entry.raw_memo}
                          </p>
                        </div>
                      );
                    }

                    // source === 'srm'
                    return (
                      <div key={`srm-${entry.id}`} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CHANNEL_COLORS[entry.channel] ?? 'bg-gray-500/20 text-gray-300'}`}>
                            {CHANNEL_LABELS[entry.channel] ?? entry.channel}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {{student: '학생', parent: '학부모', coach: '코치'}[entry.target] ?? entry.target}
                          </span>
                          {entry.trigger_type && entry.trigger_type !== 'manual' && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                              {TRIGGER_BADGE_LABELS[entry.trigger_type] ?? entry.trigger_type}
                            </span>
                          )}
                          {entry.resolution && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-gray-400 ml-auto">
                              {RESOLUTION_LABELS[entry.resolution] ?? entry.resolution}
                            </span>
                          )}
                          <span className={`text-[11px] text-gray-600 ${entry.resolution ? '' : 'ml-auto'}`}>
                            {new Date(entry.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                            {entry.author ? ` · ${entry.author}` : ''}
                          </span>
                        </div>
                        {entry.reason && (
                          <p className="text-[11px] text-gray-500 mb-1">사유: {entry.reason}</p>
                        )}
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {entry.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 하단 고정 입력폼 */}
            <div className="border-t border-white/10 px-4 py-3 shrink-0">
              <AddForm onSave={handleAdd} saving={saving} triggerContext={triggerContext} noBorder />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
