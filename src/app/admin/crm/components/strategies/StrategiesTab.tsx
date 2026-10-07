'use client';

import { useState, useEffect } from 'react';
import type { InsightPeriod } from '@/types/crm';
import { StrategyAgentChat } from '../StrategyAgentChat';
import { StrategyStats } from '../StrategyStats';
import { StrategyLibrary } from './StrategyLibrary';

interface Props {
  adminKey: string;
  segment?: 'b2c' | 'b2b'; // 전략 세그먼트 분리(097). 기본 b2c
  initialSubTab?: SubTab;
  strategyPeriod?: InsightPeriod;
  strategySeed?: { key: number; text: string; period: InsightPeriod }; // 배너에서 고른 안건 시드
  onSelectStudent?: (id: string) => void; // 세일즈 로직 드릴다운 → 학생 패널
}

type SubTab = 'logic' | 'library' | 'strategy_ai';

// 전략 에이전트(StrategyAgentChat) 사용 중단으로 UI 숨김. true로 바꾸면 탭·진입이 복구된다.
// 짝: CrmInsightBanner.tsx 의 동일 플래그(이어서 전략 짜기 CTA).
const STRATEGY_AGENT_ENABLED = false;

export function StrategiesTab({ adminKey, segment = 'b2c', initialSubTab, strategyPeriod, strategySeed, onSelectStudent }: Props) {
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab === 'strategy_ai' ? 'strategy_ai' : 'logic');

  // 배너에서 '이어서 전략 짜기'로 진입 시 전략 에이전트 서브탭으로 전환
  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  // 새 안건 시드가 오면(다른 서브탭에 있어도) 전략 에이전트 서브탭으로 전환.
  // key가 매 선택마다 증가하므로 같은 안건 재선택·연속 선택에도 확실히 반응한다.
  useEffect(() => {
    if (strategySeed) setSubTab('strategy_ai');
  }, [strategySeed?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`${subTab === 'logic' ? 'max-w-6xl' : 'max-w-3xl'} space-y-5`}>
      {/* 서브탭: 세일즈 로직 통계 / 전략 라이브러리 / 전략 에이전트 */}
      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto scrollbar-none">
        {([
          { key: 'logic', label: '세일즈 로직 통계' },
          { key: 'library', label: '전략 라이브러리' },
          ...(STRATEGY_AGENT_ENABLED ? [{ key: 'strategy_ai', label: '전략 에이전트' }] : []),
        ] as { key: SubTab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0 ${
              subTab === key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'logic' && <StrategyStats adminKey={adminKey} segment={segment} onSelectStudent={onSelectStudent} />}

      {subTab === 'strategy_ai' && <StrategyAgentChat adminKey={adminKey} period={strategyPeriod} seed={strategySeed} />}

      {subTab === 'library' && <StrategyLibrary adminKey={adminKey} segment={segment} />}
    </div>
  );
}
