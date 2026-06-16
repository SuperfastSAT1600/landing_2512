'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, BookOpen, ChevronRight } from 'lucide-react';
import { EventIssueCard, type BaseIssue } from './EventIssueCard';
import type { StudentIssue } from '@/app/api/admin/srm/student-issues/route';
import type { AlertsResponse } from '@/app/api/admin/srm/alerts/route';

const ISSUE_TYPE_COLORS: Record<string, string> = {
  schedule_pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  coach_pending: 'bg-green-500/20 text-green-400 border-green-500/30',
  renewal_needed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  custom: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const ISSUE_TYPE_LABELS: Record<string, string> = {
  schedule_pending: '스케줄 조율',
  coach_pending: '코치 배정',
  renewal_needed: '재결제',
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
  const [openIssues, setOpenIssues] = useState<StudentIssue[]>([]);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [noClassCount, setNoClassCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const since = weekStartIso();
    const [open, resolved, alerts] = await Promise.all([
      fetch('/api/admin/srm/student-issues?status=open&limit=100').then((r) => r.json()).catch(() => []),
      fetch(`/api/admin/srm/student-issues?status=resolved&resolvedSince=${since}&limit=200`).then((r) => r.json()).catch(() => []),
      fetch('/api/admin/srm/alerts').then((r) => r.json()).catch(() => null) as Promise<AlertsResponse | null>,
    ]);
    setOpenIssues(Array.isArray(open) ? open : []);
    setResolvedCount(Array.isArray(resolved) ? resolved.length : 0);
    setNoClassCount(alerts ? (alerts.noUpcomingClass ?? []).length : 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleIssueUpdated = (updated: BaseIssue) => {
    setOpenIssues((prev) => {
      if (updated.status === 'resolved') {
        setResolvedCount((c) => c + 1);
        return prev.filter((i) => i.id !== updated.id);
      }
      return prev.map((i) => (i.id === updated.id ? (updated as StudentIssue) : i));
    });
  };

  // 오래된 순서 (긴급도 높은 것 먼저)
  const sorted = [...openIssues].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div className="space-y-5">
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
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
          지금 신경 써야 할 이슈
          {sorted.length > 0 && (
            <span className="ml-2 font-normal text-gray-600 normal-case">오래된 순</span>
          )}
        </p>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-8 text-center">
            <CheckCircle size={20} className="text-green-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400">미해결 이슈 없음</p>
            <p className="text-xs text-gray-600 mt-0.5">모든 이슈가 처리되었습니다</p>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="space-y-2">
            {sorted.map((issue) => {
              const days = daysOpen(issue.created_at);
              const urgencyColor =
                days >= 5 ? 'text-red-400 bg-red-500/15 border-red-500/25' :
                days >= 2 ? 'text-orange-400 bg-orange-500/15 border-orange-500/25' :
                'text-gray-500 bg-white/5 border-white/10';

              return (
                <div key={issue.id} className="rounded-lg border border-white/8 bg-white/[0.02] overflow-hidden">
                  {/* 학생 행 */}
                  <button
                    onClick={() => onStudentClick({
                      id: issue.sfv2_profile_id ?? undefined,
                      crmStudentId: issue.student_id ?? undefined,
                      name: issue.student_name ?? '학생',
                    })}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="text-sm font-semibold text-gray-200">
                      {issue.student_name ?? '(이름 없음)'}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ISSUE_TYPE_COLORS[issue.issue_type] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                      {ISSUE_TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${urgencyColor}`}>
                      D+{days}
                    </span>
                    <ChevronRight size={11} className="text-gray-600 ml-auto shrink-0" />
                  </button>

                  {/* 이슈 카드 */}
                  <div className="px-3 pb-2.5">
                    <EventIssueCard
                      issue={issue as BaseIssue}
                      onUpdated={handleIssueUpdated}
                      apiBase="/api/admin/srm/student-issues"
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
  orange: { border: 'border-orange-500/25', bg: 'bg-orange-500/8', icon: 'text-orange-400', value: 'text-orange-300' },
  red:    { border: 'border-red-500/25',    bg: 'bg-red-500/8',    icon: 'text-red-400',    value: 'text-red-300' },
  green:  { border: 'border-green-500/25',  bg: 'bg-green-500/8',  icon: 'text-green-400',  value: 'text-green-300' },
  neutral:{ border: 'border-white/8',       bg: 'bg-white/[0.03]', icon: 'text-gray-600',   value: 'text-gray-500' },
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
        {value === null ? <span className="text-gray-600">—</span> : value}
      </p>
      <p className="text-[11px] text-gray-600 mt-0.5">{unit}</p>
    </div>
  );
}
