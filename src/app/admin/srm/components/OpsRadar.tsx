'use client';
import { srmFetch } from '../lib/srm-fetch';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, BookOpen, ChevronRight, RefreshCw } from 'lucide-react';
import { EventIssueCard, type BaseIssue } from './EventIssueCard';
import type { StudentIssue } from '@/app/api/admin/srm/student-issues/route';
import type { EventIssue } from '@/app/api/admin/srm/issues/route';
import type { AlertsResponse } from '@/app/api/admin/srm/alerts/route';

// 두 이슈 소스를 통합하는 내부 타입
interface UnifiedIssue extends BaseIssue {
  student_name: string | null;
  student_id?: string | null;
  sfv2_profile_id?: string | null;
  event_id?: string | null;
  _source: 'student' | 'event';
}

const ISSUE_TYPE_COLORS: Record<string, string> = {
  schedule_pending: 'bg-blue-100 text-blue-700 border-blue-200',
  coach_pending: 'bg-green-100 text-green-700 border-green-200',
  renewal_needed: 'bg-purple-100 text-purple-700 border-purple-200',
  cancellation: 'bg-red-100 text-red-700 border-red-200',
  coach_change: 'bg-orange-100 text-orange-700 border-orange-200',
  no_show: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  custom: 'bg-gray-100 text-gray-600 border-gray-200',
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  schedule_pending: '스케줄 조율',
  coach_pending: '코치 배정',
  renewal_needed: '재결제',
  cancellation: '취소/재예약',
  coach_change: '코치 교체',
  no_show: '노쇼',
  custom: '기타',
};

function daysOpen(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

function weekStartIso() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // 월요일 기준
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

interface Props {
  onStudentClick: (student: { id?: string; crmStudentId?: string; name: string }) => void;
}

export function OpsRadar({ onStudentClick }: Props) {
  const [openIssues, setOpenIssues] = useState<UnifiedIssue[]>([]);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [noClassCount, setNoClassCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const since = weekStartIso();
    try {
      const [studentOpenRes, eventOpenRes, studentResolvedRes, eventResolvedRes, alertsRes] = await Promise.all([
        srmFetch('/api/admin/srm/student-issues?status=open&limit=100'),
        srmFetch('/api/admin/srm/issues?status=open&limit=100'),
        srmFetch(`/api/admin/srm/student-issues?status=resolved&resolvedSince=${since}&limit=200`),
        srmFetch(`/api/admin/srm/issues?status=resolved&resolvedSince=${since}&limit=200`),
        srmFetch('/api/admin/srm/alerts'),
      ]);

      const studentOpen: StudentIssue[] = studentOpenRes.ok ? await studentOpenRes.json() : [];
      const eventOpen: EventIssue[] = eventOpenRes.ok ? await eventOpenRes.json() : [];
      const studentResolved = studentResolvedRes.ok ? await studentResolvedRes.json() : [];
      const eventResolved = eventResolvedRes.ok ? await eventResolvedRes.json() : [];
      const alerts: AlertsResponse | null = alertsRes.ok ? await alertsRes.json() : null;

      if (!studentOpenRes.ok || !eventOpenRes.ok) {
        setFetchError(`이슈 로드 실패 (student:${studentOpenRes.status} event:${eventOpenRes.status})`);
      }

      const unified: UnifiedIssue[] = [
        ...(Array.isArray(studentOpen) ? studentOpen : []).map((i) => ({
          ...i,
          _source: 'student' as const,
        })),
        ...(Array.isArray(eventOpen) ? eventOpen : []).map((i) => ({
          ...i,
          student_id: null,
          sfv2_profile_id: null,
          _source: 'event' as const,
        })),
      ];

      setOpenIssues(unified);
      setResolvedCount(
        (Array.isArray(studentResolved) ? studentResolved.length : 0) +
        (Array.isArray(eventResolved) ? eventResolved.length : 0),
      );
      setNoClassCount(alerts ? (alerts.noUpcomingClass ?? []).length : 0);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : '네트워크 오류');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleIssueUpdated = (updated: BaseIssue) => {
    setOpenIssues((prev) => {
      if (updated.status === 'resolved') {
        setResolvedCount((c) => c + 1);
        return prev.filter((i) => i.id !== updated.id);
      }
      return prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i));
    });
  };

  // 오래된 순서 (긴급도 높은 것 먼저)
  const sorted = [...openIssues].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div className="space-y-5">
      {/* 에러 배너 */}
      {fetchError && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle size={13} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-700 font-medium">데이터 로드 실패</p>
            <p className="text-[11px] text-red-600 mt-0.5 break-all">{fetchError}</p>
          </div>
          <button
            onClick={load}
            className="text-[11px] text-red-600 hover:text-red-700 shrink-0 underline"
          >
            재시도
          </button>
        </div>
      )}

      {/* 신호 카드 3개 */}
      <div className="grid grid-cols-3 gap-3">
        <SignalCard
          icon={<AlertTriangle size={13} />}
          label="미해결 이슈"
          value={loading ? null : openIssues.length}
          unit="건"
          color={openIssues.length > 0 ? 'orange' : 'neutral'}
        />
        <SignalCard
          icon={<BookOpen size={13} />}
          label="수업 미잡힘"
          value={loading ? null : noClassCount}
          unit="명"
          color={noClassCount > 0 ? 'red' : 'neutral'}
        />
        <SignalCard
          icon={<CheckCircle size={13} />}
          label="이번 주 해결"
          value={loading ? null : resolvedCount}
          unit="건"
          color={resolvedCount > 0 ? 'green' : 'neutral'}
        />
      </div>

      {/* 이슈 목록 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            지금 신경 써야 할 이슈
            {sorted.length > 0 && (
              <span className="ml-2 font-normal text-gray-400 normal-case">오래된 순</span>
            )}
          </p>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center">
            <CheckCircle size={20} className="text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">미해결 이슈 없음</p>
            <p className="text-xs text-gray-400 mt-0.5">모든 이슈가 처리되었습니다</p>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="space-y-2">
            {sorted.map((issue) => {
              const days = daysOpen(issue.created_at);
              const urgencyColor =
                days >= 5 ? 'text-red-700 bg-red-100 border-red-200' :
                days >= 2 ? 'text-orange-700 bg-orange-100 border-orange-200' :
                'text-gray-500 bg-gray-100 border-gray-200';
              const apiBase = issue._source === 'event'
                ? '/api/admin/srm/issues'
                : '/api/admin/srm/student-issues';

              return (
                <div key={issue.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  {/* 학생 행 */}
                  <button
                    onClick={() => onStudentClick({
                      id: issue.sfv2_profile_id ?? undefined,
                      crmStudentId: issue.student_id ?? undefined,
                      name: issue.student_name ?? '학생',
                    })}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-sm font-semibold text-gray-800">
                      {issue.student_name ?? '(이름 없음)'}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ISSUE_TYPE_COLORS[issue.issue_type] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${urgencyColor}`}>
                      D+{days}
                    </span>
                    {issue._source === 'event' && (
                      <span className="text-[10px] text-gray-400 ml-1">수업이슈</span>
                    )}
                    <ChevronRight size={11} className="text-gray-400 ml-auto shrink-0" />
                  </button>

                  {/* 이슈 카드 */}
                  <div className="px-3 pb-2.5">
                    <EventIssueCard
                      issue={issue as BaseIssue}
                      onUpdated={handleIssueUpdated}
                      onDeleted={(id) => setOpenIssues((prev) => prev.filter((i) => i.id !== id))}
                      apiBase={apiBase}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Signal Card ──────────────────────────────────────────────
const COLOR_MAP = {
  orange: { border: 'border-orange-200', bg: 'bg-orange-50',  icon: 'text-orange-600', value: 'text-orange-700' },
  red:    { border: 'border-red-200',    bg: 'bg-red-50',     icon: 'text-red-600',    value: 'text-red-700' },
  green:  { border: 'border-green-200',  bg: 'bg-green-50',   icon: 'text-green-600',  value: 'text-green-700' },
  neutral:{ border: 'border-gray-200',   bg: 'bg-white',      icon: 'text-gray-500',   value: 'text-gray-700' },
};

function SignalCard({
  icon, label, value, unit, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  unit: string;
  color: keyof typeof COLOR_MAP;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} px-4 py-3`}>
      <div className={`flex items-center gap-1.5 mb-1.5 ${c.icon}`}>
        {icon}
        <span className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${c.value}`}>
        {value === null ? <span className="text-gray-400">—</span> : value}
      </p>
      <p className="text-[11px] text-gray-400 mt-0.5">{unit}</p>
    </div>
  );
}
