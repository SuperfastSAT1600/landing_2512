'use client';

import { useCallback, useMemo, useState } from 'react';
import type { WeeklyGoalRow } from '@/lib/marketing-goals';
import { kstDateStr, mondayOf } from '@/lib/marketing-week';
import MarketingTabs from '../components/MarketingTabs';
import WeeklyGoalEditor from '../components/WeeklyGoalEditor';
import SourceMixTable from '../components/SourceMixTable';

function getAdminKey() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_key') || '';
}

/**
 * 마케팅 > 목표 — 주차 리드 목표와 그 주차 유입 소스 구성만 보는 화면.
 *
 * 목표는 주차 총합 1건이고, 소스 구성은 Business 한국비즈니스와 같은 기준으로 자동 집계된다.
 * 주차 데이터는 편집기가 한 번만 읽어 onSnapshot 으로 올리므로 소스 구성표가 늘 같은 주차를 가리킨다.
 */
export default function MarketingGoalsPage() {
  const currentWeekStart = useMemo(() => mondayOf(kstDateStr(new Date())), []);
  const [week, setWeek] = useState<WeeklyGoalRow | null>(null);
  const adminKey = typeof window !== 'undefined' ? getAdminKey() : '';

  const handleSnapshot = useCallback((row: WeeklyGoalRow | null) => setWeek(row), []);

  return (
    <div className="min-h-screen bg-[#151719] text-[#E0E0E0] p-6 space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">마케팅 목표</h1>
          <p className="text-sm text-gray-500 mt-0.5">주차별 리드 목표 · 목표 대비 실적 · 유입 소스 구성</p>
        </div>
        <MarketingTabs active="/admin/marketing/goals" />
      </div>

      <WeeklyGoalEditor
        adminKey={adminKey}
        currentWeekStart={currentWeekStart}
        onSaved={() => { /* 편집기 내부에서 재조회하고 onSnapshot 으로 올린다 */ }}
        onSnapshot={handleSnapshot}
      />

      <SourceMixTable week={week} />
    </div>
  );
}
