'use client';

import { useCallback, useEffect, useState } from 'react';
import { PlayCircle, PauseCircle, StopCircle, RefreshCw, XCircle, AlertTriangle } from 'lucide-react';
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
  refreshKey?: number;
}

type Tab = 'unlinked' | TutoringStatus;

const TAB_META: Record<Tab, { label: string; icon: React.ReactNode; color: string; activeColor: string }> = {
  unlinked:     { label: '미연결',          icon: <AlertTriangle size={10} />, color: 'text-orange-500', activeColor: 'bg-orange-500 text-white' },
  active:       { label: '수업중',           icon: <PlayCircle size={10} />,   color: 'text-emerald-600', activeColor: 'bg-emerald-600 text-white' },
  paused:       { label: '휴원',             icon: <PauseCircle size={10} />,  color: 'text-orange-500', activeColor: 'bg-orange-500 text-white' },
  partial_end:  { label: '부분종료',          icon: <StopCircle size={10} />,   color: 'text-gray-500', activeColor: 'bg-gray-500 text-white' },
  sales:        { label: '세일즈',           icon: <RefreshCw size={10} />,    color: 'text-blue-600', activeColor: 'bg-blue-600 text-white' },
  ended:        { label: '종료',             icon: <XCircle size={10} />,      color: 'text-red-500', activeColor: 'bg-red-500 text-white' },
};

const TAB_ORDER: Tab[] = ['unlinked', 'active', 'paused', 'partial_end', 'sales', 'ended'];

function UserRow({ user, onClick }: { user: TutoringUser; onClick: () => void }) {
  const meta = TAB_META[user.status];
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
          잔여{' '}
          <span className={`font-semibold ${user.netRemainingHours < 0 ? 'text-red-600' : 'text-gray-700'}`}>
            {user.netRemainingHours}h
          </span>
          <span className="text-gray-400"> / {user.purchasedHours}h</span>
        </span>
        <span className={`flex items-center gap-0.5 text-[10px] font-medium ${meta.color}`}>
          {meta.icon}{meta.label}
        </span>
      </div>
    </button>
  );
}

function UnlinkedRow({ user, onClick }: { user: UnlinkedTutoringUser; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-100 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-800 truncate">{user.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-gray-500">
          잔여{' '}
          <span className={`font-semibold ${user.netRemainingHours < 0 ? 'text-red-600' : 'text-orange-700'}`}>
            {user.netRemainingHours}h
          </span>
          <span className="text-gray-400"> / {user.purchasedHours}h</span>
        </span>
        <span className="text-[10px] font-medium text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
          연결 필요
        </span>
      </div>
    </button>
  );
}

export function TutoringUserList({ onStudentClick, refreshKey }: Props) {
  const [linked, setLinked] = useState<TutoringUser[]>([]);
  const [unlinked, setUnlinked] = useState<UnlinkedTutoringUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('unlinked');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await srmFetch('/api/admin/srm/tutoring-users');
      if (!res.ok) throw new Error(`${res.status}`);
      const data: TutoringUsersResponse = await res.json();
      const linkedUsers = Array.isArray(data.linked) ? data.linked : [];
      const unlinkedUsers = Array.isArray(data.unlinked) ? data.unlinked : [];
      setLinked(linkedUsers);
      setUnlinked(unlinkedUsers);
      // 미연결이 없으면 수업중 탭으로 기본 이동
      if (unlinkedUsers.length === 0) setActiveTab('active');
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers, refreshKey]);

  const byStatus = (Object.keys(TAB_META) as Tab[]).reduce<Record<Tab, TutoringUser[]>>(
    (acc, t) => ({ ...acc, [t]: t === 'unlinked' ? [] : linked.filter((u) => u.status === t) }),
    {} as Record<Tab, TutoringUser[]>
  );

  const countOf = (t: Tab) => t === 'unlinked' ? unlinked.length : byStatus[t].length;

  if (loading) {
    return (
      <div className="space-y-1.5">
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
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

  return (
    <div className="space-y-3">
      {/* 탭 바 */}
      <div className="flex flex-wrap gap-1">
        {TAB_ORDER.map((t) => {
          const cnt = countOf(t);
          const meta = TAB_META[t];
          const isActive = activeTab === t;
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                isActive ? meta.activeColor : `${meta.color} bg-gray-50 hover:bg-gray-100`
              }`}
            >
              {meta.icon}
              {meta.label}
              <span className={`text-[10px] px-1 rounded-full ${isActive ? 'bg-white/30' : 'bg-gray-200 text-gray-600'}`}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="space-y-1">
        {activeTab === 'unlinked' ? (
          unlinked.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">미연결 학생 없음 — 모두 연결됨</p>
          ) : (
            unlinked.map((u) => (
              <UnlinkedRow
                key={u.sfv2ProfileId}
                user={u}
                onClick={() => onStudentClick({ id: u.sfv2ProfileId, name: u.name, purchasedHours: u.purchasedHours })}
              />
            ))
          )
        ) : (
          byStatus[activeTab].length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">해당 학생 없음</p>
          ) : (
            byStatus[activeTab].map((u) => (
              <UserRow
                key={u.sfv2ProfileId}
                user={u}
                onClick={() => onStudentClick({
                  id: u.sfv2ProfileId,
                  crmStudentId: u.crmStudentId ?? undefined,
                  name: u.name,
                  tutoringStatus: u.status,
                  remainingHours: u.netRemainingHours,
                  purchasedHours: u.purchasedHours,
                })}
              />
            ))
          )
        )}
      </div>
    </div>
  );
}
