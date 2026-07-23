'use client';

import { useState } from 'react';
import type { Student } from '@/types/crm';
import { B2bHub } from './b2b/B2bHub';
import { B2bPipeline } from './b2b/B2bPipeline';
import { StrategyStats } from './StrategyStats';
import { WeeklyPlan } from './WeeklyPlan';

type B2bTab = 'overview' | 'pipeline' | 'weekly';
type PipeSub = 'pipeline' | 'strategy';

interface B2bWorkspaceProps {
  adminKey: string;
  students: Student[];
  onStudentClick: (student: Student) => void;
  onSelectStudentById: (id: string) => void;
}

export function B2bWorkspace({ adminKey, students, onStudentClick, onSelectStudentById }: B2bWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<B2bTab>('overview');
  const [pipeSub, setPipeSub] = useState<PipeSub>('pipeline');

  return (
    <div className="px-8 py-6">
      <div className="flex gap-6 mb-6 border-b border-gray-100">
        {([
          { key: 'overview', label: '업체·리드 현황·통계' },
          { key: 'pipeline', label: '영업 파이프라인·전략' },
          { key: 'weekly',   label: '주차 계획·이행' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-0.5 py-2.5 -mb-px text-sm font-medium border-b-2 transition-colors ${
              activeTab === key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <B2bHub adminKey={adminKey} students={students} onStudentClick={onStudentClick} />
      )}

      {activeTab === 'pipeline' && (
        <div className="space-y-5">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
            {([
              { key: 'pipeline', label: '영업 진행중 업체' },
              { key: 'strategy', label: '전략별 수치' },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setPipeSub(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${pipeSub === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          {pipeSub === 'pipeline' && <B2bPipeline adminKey={adminKey} />}
          {pipeSub === 'strategy' && <StrategyStats adminKey={adminKey} segment="b2b" onSelectStudent={onSelectStudentById} />}
        </div>
      )}

      {activeTab === 'weekly' && <WeeklyPlan segment="b2b" adminKey={adminKey} />}
    </div>
  );
}
