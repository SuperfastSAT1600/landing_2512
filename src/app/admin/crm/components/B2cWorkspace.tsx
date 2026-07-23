'use client';

import { useState, useCallback, useMemo } from 'react';
import { Student, isStageStalled, type InsightPeriod } from '@/types/crm';
import { StrategiesTab } from './StrategiesTab';
import { CrmInsightBanner } from './CrmInsightBanner';
import { DailyTasks } from './DailyTasks';
import { LeadsHub } from './LeadsHub';
import { WeeklyPlan } from './WeeklyPlan';

type B2cTab = 'leads' | 'strategies' | 'weekly';

// 선제 진단 인사이트 배너(CrmInsightBanner) 사용 중단으로 숨김. true로 바꾸면 복구.
const INSIGHT_BANNER_ENABLED = false;

interface B2cWorkspaceProps {
  students: Student[];
  todayActions: Student[];
  adminKey: string;
  onStudentUpdate: (id: string, updates: Partial<Student>) => void;
  onStudentClick: (student: Student) => void;
  onSelectStudentById: (id: string) => void;
  fetchStudents: () => void;
  retryEnrolledId: string | null;
  onEnrolledHandled: () => void;
}

export function B2cWorkspace({
  students,
  todayActions,
  adminKey,
  onStudentUpdate,
  onStudentClick,
  onSelectStudentById,
  fetchStudents,
  retryEnrolledId,
  onEnrolledHandled,
}: B2cWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<B2cTab>('leads');
  const [strategiesInitialSubTab, setStrategiesInitialSubTab] = useState<'experiment' | 'logic' | 'library' | 'strategy_ai' | undefined>(undefined);
  const [strategyPeriod, setStrategyPeriod] = useState<InsightPeriod | undefined>(undefined);
  // 배너 '이어서 전략 짜기'에서 고른 안건 시드 — key 증가로 매 선택마다 새 스레드 트리거
  const [strategySeed, setStrategySeed] = useState<{ key: number; text: string; period: InsightPeriod } | undefined>(undefined);

  const openStrategyAgent = useCallback((period: InsightPeriod, seed?: string) => {
    setStrategyPeriod(period);
    setStrategiesInitialSubTab('strategy_ai');
    if (seed) setStrategySeed((prev) => ({ key: (prev?.key ?? 0) + 1, text: seed, period }));
    setActiveTab('strategies');
  }, []);

  // 오늘 실행(주차 계획 내) 데이터 — 전체 활성 리드 기준
  const followUpStudents = useMemo(() => {
    const fiveDaysAgo = Date.now() - 5 * 86400000;
    return students.filter(
      s =>
        s.lead_status === 'active' &&
        !s.retry_strategy_id &&
        s.last_contacted_at !== null &&
        new Date(s.last_contacted_at).getTime() < fiveDaysAgo
    );
  }, [students]);

  const stalledStudents = useMemo(() => {
    const now = Date.now();
    return students.filter(
      s => s.lead_status === 'active' && !s.retry_strategy_id && isStageStalled(s, now)
    );
  }, [students]);

  return (
    <div className="px-4 py-4 sm:px-8 sm:py-6">
      {/* 최상위 3메뉴 */}
      <div className="flex gap-4 sm:gap-6 mb-6 border-b border-gray-100 overflow-x-auto scrollbar-none">
        {([
          { key: 'leads',      label: '리드 현황·통계' },
          { key: 'strategies', label: '세일즈 전략' },
          { key: 'weekly',     label: '주차 계획·이행' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-0.5 py-2.5 -mb-px text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'leads' && (
        <LeadsHub
          students={students}
          adminKey={adminKey}
          onStudentUpdate={onStudentUpdate}
          onStudentClick={onStudentClick}
          onSelectStudentById={onSelectStudentById}
          fetchStudents={fetchStudents}
          retryEnrolledId={retryEnrolledId}
          onEnrolledHandled={onEnrolledHandled}
        />
      )}

      {activeTab === 'strategies' && (
        <>
          {INSIGHT_BANNER_ENABLED && <CrmInsightBanner adminKey={adminKey} onOpenStrategy={openStrategyAgent} />}
          <StrategiesTab adminKey={adminKey} initialSubTab={strategiesInitialSubTab} strategyPeriod={strategyPeriod} strategySeed={strategySeed} onSelectStudent={onSelectStudentById} />
        </>
      )}

      {activeTab === 'weekly' && (
        <WeeklyPlan
          segment="b2c"
          adminKey={adminKey}
          dailyView={
            <DailyTasks
              followUpStudents={followUpStudents}
              stalledStudents={stalledStudents}
              actionedStudents={todayActions}
              onStudentClick={onStudentClick}
              onStudentUpdate={onStudentUpdate}
            />
          }
        />
      )}
    </div>
  );
}
