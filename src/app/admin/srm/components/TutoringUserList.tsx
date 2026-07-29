'use client';

import { useCallback, useEffect, useState } from 'react';
import { PlayCircle, PauseCircle, StopCircle, RefreshCw, XCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { srmFetch } from '../lib/srm-fetch';
import type { TutoringUser, TutoringStatus, UnlinkedTutoringUser, TutoringUsersResponse } from '@/app/api/admin/srm/tutoring-users/route';

interface SelectedStudent {
  id?: string;
  crmStudentId?: string;
  name: string;
  tutoringStatus?: TutoringStatus;
  remainingHours?: number;
  purchasedHours?: number;
}

interface Props {
  onStudentClick: (student: SelectedStudent) => void;
}

const STATUS_META: Record<TutoringStatus, { label: string; icon: React.ReactNode; color: string }> = {
  active:       { label: '수업중',           icon: <PlayCircle size={11} />,   color: 'text-emerald-600' },
  paused:       { label: '휴원',             icon: <PauseCircle size={11} />,  color: 'text-orange-500' },
  partial_end:  { label: '부분종료',          icon: <StopCircle size={11} />,   color: 'text-gray-500' },
  sales:        { label: '재결제 세일즈 중',  icon: <RefreshCw size={11} />,    color: 'text-blue-600' },
  ended:        { label: '종료',             icon: <XCircle size={11} />,      color: 'text-red-500' },
};

const STATUS_ORDER: TutoringStatus[] = ['active', 'paused', 'partial_end', 'sales', 'ended'];

function UserRow({ user, onClick }: { user: TutoringUser; onClick: () => void }) {
  const meta = STATUS_META[user.status];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-100 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">{user.name}</span>
          {user.grade && <span className="text-[11px] text-gray-400 shrink-0">{user.grade}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] text-gray-500">
          잔여 <span className="font-semibold text-gray-700">{user.remainingHours}h</span>
          <span className="text-gray-400"> / {user.purchasedHours}h</span>
        </span>
        <span className={`flex items-center gap-0.5 text-[10px] font-medium ${meta.color}`}>
          {meta.icon}
          {meta.label}
        </span>
      </div>
    </button>
  );
}

function UnlinkedRow({ user, onClick }: { user: UnlinkedTutoringUser; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg hover:border-orange-400 hover:bg-orange-100 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-800 truncate">{user.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-gray-500">
          구매 <span className="font-semibold text-orange-700">{user.purchasedHours}h</span>
        </span>
        <span className="text-[10px] font-medium text-orange-600 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded">
          연결 필요
        </span>
      </div>
    </button>
  );
}

function Section({
  status, users, onStudentClick, defaultOpen,
}: {
  status: TutoringStatus; users: TutoringUser[];
  onStudentClick: (u: TutoringUser) => void; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = STATUS_META[status];
  if (!users.length) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mb-2 hover:opacity-80 transition-opacity ${meta.color}`}
      >
        {meta.icon}
        {meta.label} ({users.length}명)
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {open && (
        <div className="space-y-1">
          {users.map((u) => (
            <UserRow key={u.sfv2ProfileId} user={u} onClick={() => onStudentClick(u)} />
          ))}
        </div>
      )}
    </div>
  );
}

function UnlinkedSection({ users, onStudentClick }: { users: UnlinkedTutoringUser[]; onStudentClick: (u: UnlinkedTutoringUser) => void }) {
  const [open, setOpen] = useState(true);
  if (!users.length) return null;

  return (
    <div className="border border-orange-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-orange-50 text-left hover:bg-orange-100 transition-colors"
      >
        <AlertTriangle size={12} className="text-orange-500 shrink-0" />
        <span className="text-[11px] font-semibold text-orange-700 flex-1">CRM 미연결 ({users.length}명)</span>
        <span className="text-[10px] text-orange-500">스케줄 추적 불가 — 연결 필요</span>
        {open ? <ChevronUp size={10} className="text-orange-500 shrink-0" /> : <ChevronDown size={10} className="text-orange-500 shrink-0" />}
      </button>
      {open && (
        <div className="p-2 space-y-1 bg-white">
          {users.map((u) => (
            <UnlinkedRow key={u.sfv2ProfileId} user={u} onClick={() => onStudentClick(u)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TutoringUserList({ onStudentClick }: Props) {
  const [linked, setLinked] = useState<TutoringUser[]>([]);
  const [unlinked, setUnlinked] = useState<UnlinkedTutoringUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await srmFetch('/api/admin/srm/tutoring-users');
      if (!res.ok) throw new Error(`${res.status}`);
      const data: TutoringUsersResponse = await res.json();
      setLinked(Array.isArray(data.linked) ? data.linked : []);
      setUnlinked(Array.isArray(data.unlinked) ? data.unlinked : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleLinkedClick = (u: TutoringUser) => {
    onStudentClick({
      id: u.sfv2ProfileId,
      crmStudentId: u.crmStudentId ?? undefined,
      name: u.name,
      tutoringStatus: u.status,
      remainingHours: u.remainingHours,
      purchasedHours: u.purchasedHours,
    });
  };

  const handleUnlinkedClick = (u: UnlinkedTutoringUser) => {
    onStudentClick({ id: u.sfv2ProfileId, name: u.name, purchasedHours: u.purchasedHours });
  };

  if (loading) {
    return (
      <div className="space-y-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
        <p className="text-xs text-gray-400 text-center pt-2">v2 데이터 집계 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 py-4">
        오류: {error}
        <button onClick={fetchUsers} className="ml-2 underline text-blue-600">재시도</button>
      </div>
    );
  }

  const byStatus = STATUS_ORDER.reduce<Record<TutoringStatus, TutoringUser[]>>(
    (acc, s) => ({ ...acc, [s]: linked.filter((u) => u.status === s) }),
    {} as Record<TutoringStatus, TutoringUser[]>
  );
  const totalActive = byStatus.active.length + byStatus.paused.length + byStatus.partial_end.length;

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">
        전체 {linked.length}명 · 수업 중 {totalActive}명 · 재결제 세일즈 {byStatus.sales.length}명 · 종료 {byStatus.ended.length}명
        {unlinked.length > 0 && <span className="text-orange-500 font-medium"> · 미연결 {unlinked.length}명</span>}
      </p>

      {/* 미연결 섹션 — 최우선 표시 */}
      <UnlinkedSection users={unlinked} onStudentClick={handleUnlinkedClick} />

      {/* 연결된 튜터링 유저 */}
      {STATUS_ORDER.map((s) => (
        <Section
          key={s}
          status={s}
          users={byStatus[s]}
          onStudentClick={handleLinkedClick}
          defaultOpen={s === 'active' || s === 'sales'}
        />
      ))}
    </div>
  );
}
