'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronDown, ChevronUp, ExternalLink, Sparkles } from 'lucide-react';
import { CommLog } from './CommLog';
import type { CommEntry } from '@/app/api/admin/srm/communications/route';
import { CrmLinkSection } from './CrmLinkSection';
import { LifecycleTab } from './LifecycleTab';
import { STAGE_LABELS } from '@/app/admin/srm/lifecycle-constants';
import type { LifecycleResponse } from '@/app/api/admin/srm/lifecycle/route';

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

interface StudentDetail {
  profile: { id: string; full_name: string; email: string | null; phone: string | null; grade: string | null } | null;
  crmStudent: { id: string; name: string; consultation_timeline: ConsultationEntry[]; sfv2_profile_id: string | null } | null;
}

type Tab = 'comm' | 'crm';

function getAdminName() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_user_name') ?? '';
}

interface Props {
  // sfv2ProfileId: v2 유저 기준으로 열 때 (스케줄, 알림 등)
  // crmStudentId: CRM 학생 기준으로 열 때 (명단 탭)
  // 둘 중 하나는 반드시 있어야 함
  studentId?: string;       // sfv2 profile ID (기존 호환)
  crmStudentId?: string;    // CRM student ID
  studentName: string;
  onClose: () => void;
  triggerType?: string;
  eventId?: string;
  coachId?: string;
}

export function StudentPanel({ studentId, crmStudentId, studentName, onClose, triggerType, eventId, coachId }: Props) {
  const [tab, setTab] = useState<Tab>('comm');
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [comms, setComms] = useState<CommEntry[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingComms, setLoadingComms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lifecycleData, setLifecycleData] = useState<LifecycleResponse | null>(null);
  const [lifecycleOpen, setLifecycleOpen] = useState(false);
  const [briefing, setBriefing] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // comm 로그 키: sfv2ProfileId 있으면 그걸 쓰고, 없으면 crmStudentId
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

  useEffect(() => {
    fetchDetail();
    fetchComms();
    fetchLifecycle();
  }, [fetchDetail, fetchComms, fetchLifecycle]);

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

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-30" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-[420px] bg-[#1a1c1f] border-l border-white/10 z-40 flex flex-col shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
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
            {loadingDetail ? (
              <div className="h-3 w-24 bg-white/10 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                {detail?.profile?.grade ?? ''}
                {studentId && isLinked ? ' · CRM 연결됨' : ''}
                {!studentId && crmStudentId ? ' · CRM' : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* 라이프사이클 accordion */}
        {lifecycleOpen && (
          <div className="border-b border-white/10 px-5 py-4 bg-[#15171a] max-h-80 overflow-y-auto">
            <LifecycleTab
              profileId={studentId ?? ''}
              studentId={resolvedCrmStudentId}
            />
          </div>
        )}

        {/* 탭 */}
        <div className="flex border-b border-white/10">
          {(['comm', 'crm'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                tab === t ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'comm' ? '커뮤니케이션' : `CRM${isLinked ? ` (${timeline.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'comm' && (
            <CommLog
              entries={comms}
              loading={loadingComms}
              saving={saving}
              onAdd={handleAdd}
              triggerContext={triggerContext}
            />
          )}

          {tab === 'crm' && (
            <div className="space-y-4">
              {!loadingDetail && !isLinked && studentId && (
                <CrmLinkSection sfv2ProfileId={studentId} onLinked={handleLinked} />
              )}
              {!loadingDetail && !isLinked && !studentId && (
                <p className="text-xs text-gray-500">v2 계정과 연결하려면 연결 탭을 이용하세요.</p>
              )}

              {/* 코치 포털 액션 */}
              {resolvedCrmStudentId && (
                <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-300">코치 포털</p>
                    <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                      /coach-prep/{resolvedCrmStudentId.slice(0, 8)}…
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateBrief}
                    disabled={briefing === 'loading'}
                    title="AI로 내부 정보를 제거한 코치용 브리핑 생성"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                      briefing === 'loading'
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                        : briefing === 'done'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : briefing === 'error'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30'
                    }`}
                  >
                    <Sparkles size={11} className={briefing === 'loading' ? 'animate-pulse' : ''} />
                    {briefing === 'loading' ? '생성 중…' : briefing === 'done' ? '완료' : briefing === 'error' ? '실패' : 'AI 브리핑'}
                  </button>
                  <a
                    href={`/coach-prep/${resolvedCrmStudentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="코치 포털 열기"
                    className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors shrink-0"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}

              {loadingDetail && (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
                </div>
              )}

              {!loadingDetail && isLinked && timeline.length === 0 && (
                <p className="text-xs text-gray-600">CRM에 상담 기록이 없습니다.</p>
              )}

              {!loadingDetail && isLinked && timeline.length > 0 && (
                <div className="space-y-3">
                  {[...timeline]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((entry) => (
                      <div key={entry.id} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] text-gray-500">
                            {new Date(entry.created_at).toLocaleDateString('ko-KR', {
                              year: 'numeric', month: 'numeric', day: 'numeric',
                            })}
                          </span>
                          {entry.author && (
                            <span className="text-[11px] text-gray-600">· {entry.author}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {entry.raw_memo}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
