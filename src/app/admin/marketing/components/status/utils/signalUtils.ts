import type { MarketingGroup } from '@/lib/marketing-groups';
import { MARKETING_GROUPS } from '@/lib/marketing-groups';
import type { WeekRow } from './groupByPeriod';

export type SignalLevel = 'good' | 'warning' | 'danger';

export interface ChannelSignal {
  channel: MarketingGroup;
  level: SignalLevel;
  reasons: string[];
}

const LEVEL_ORDER: Record<SignalLevel, number> = { danger: 0, warning: 1, good: 2 };

function isMonotonicallyDecreasing(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (values[i] >= values[i - 1]) return false;
  }
  return true;
}

export function classifyChannelSignals(
  weekRows: WeekRow[],
  weeklyTarget: number | null,
  weeklyActual: Record<MarketingGroup, number>
): ChannelSignal[] {
  const allChannels: MarketingGroup[] = [...MARKETING_GROUPS, '미분류'];
  const recent3 = weekRows.slice(-3);

  const signals: ChannelSignal[] = allChannels.map((channel) => {
    const reasons: string[] = [];

    const consecutiveDecline =
      recent3.length === 3 &&
      isMonotonicallyDecreasing(recent3.map((w) => w.channels[channel]));

    if (consecutiveDecline) {
      reasons.push('3주 연속 감소 중');
    }

    const actual = weeklyActual[channel] ?? 0;
    let achievementRate: number | null = null;

    if (weeklyTarget !== null && weeklyTarget > 0) {
      achievementRate = Math.round((actual / weeklyTarget) * 100);
      reasons.push(`목표 달성률 ${achievementRate}%`);
    }

    let level: SignalLevel;
    const belowHalf = achievementRate !== null && achievementRate < 50;
    const belowThreeQuarters = achievementRate !== null && achievementRate < 75;

    if (consecutiveDecline && belowHalf) {
      level = 'danger';
    } else if (consecutiveDecline || belowThreeQuarters) {
      level = 'warning';
    } else {
      level = 'good';
    }

    return { channel, level, reasons };
  });

  return signals.sort((a, b) => {
    const levelDiff = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
    if (levelDiff !== 0) return levelDiff;
    return a.channel.localeCompare(b.channel);
  });
}
