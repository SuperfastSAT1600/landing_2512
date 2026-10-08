import type { DesmosAnalysisItem, DesmosFlag } from '@/lib/report-data';

interface Props {
  desmosAnalysis: DesmosAnalysisItem[];
}

const FLAG_CONFIG: Record<DesmosFlag, {
  title: string;
  subtitle: string;
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  timeLabel?: string;
}> = {
  SLOW_WITH_DESMOS: {
    title: 'Desmos 사용했지만 시간 초과',
    subtitle: 'Desmos를 켰지만 2분(120초) 이상 소요. 그래프를 읽는 속도를 높이거나 대수적 풀이로 전환하는 연습이 필요합니다.',
    bg: '#FFF7ED',
    border: '#FED7AA',
    badgeBg: '#FED7AA',
    badgeText: '#C2410C',
  },
  UNNECESSARY_DESMOS: {
    title: 'Desmos 없이 풀어야 할 문제',
    subtitle: '대수·산술·통계 문제에 Desmos를 사용했습니다. 손으로 빠르게 풀 수 있는 유형인데 Desmos에 의존하면 오히려 속도가 느려집니다.',
    bg: '#FFF1F2',
    border: '#FECDD3',
    badgeBg: '#FECDD3',
    badgeText: '#BE123C',
  },
  MISSING_DESMOS: {
    title: 'Desmos를 썼어야 할 문제',
    subtitle: '그래프·교점·함수 분석이 핵심인 문제에서 Desmos를 사용하지 않았습니다. Desmos를 활용했다면 더 빠르고 확실하게 풀 수 있는 유형입니다.',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    badgeBg: '#BFDBFE',
    badgeText: '#1D4ED8',
  },
};

const FLAG_ORDER: DesmosFlag[] = ['SLOW_WITH_DESMOS', 'UNNECESSARY_DESMOS', 'MISSING_DESMOS'];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

export function ReportDesmosAnalysis({ desmosAnalysis }: Props) {
  const flaggedItems: Record<DesmosFlag, DesmosAnalysisItem[]> = {
    SLOW_WITH_DESMOS: [],
    UNNECESSARY_DESMOS: [],
    MISSING_DESMOS: [],
  };

  for (const item of desmosAnalysis) {
    for (const flag of item.flags) {
      flaggedItems[flag].push(item);
    }
  }

  const hasAnyFlag = FLAG_ORDER.some(f => flaggedItems[f].length > 0);

  if (!hasAnyFlag) {
    return (
      <div
        style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 12,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>✓</span>
        <span style={{ fontSize: 14, color: '#15803D', fontWeight: 500 }}>
          Desmos 사용 패턴에 특이사항이 없습니다.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {FLAG_ORDER.map(flag => {
        const items = flaggedItems[flag];
        if (items.length === 0) return null;
        const cfg = FLAG_CONFIG[flag];

        return (
          <div
            key={flag}
            style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: 12,
              padding: '18px 20px',
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: cfg.badgeText,
                marginBottom: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {cfg.title}
            </p>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 1.6 }}>
              {cfg.subtitle}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(item => (
                <div
                  key={item.questionId}
                  style={{
                    background: 'white',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        background: cfg.badgeBg,
                        color: cfg.badgeText,
                        borderRadius: 6,
                        padding: '2px 8px',
                        flexShrink: 0,
                      }}
                    >
                      Q{item.questionNumber}
                    </span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: 0 }}>
                        {item.skill}
                      </p>
                      <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                        {item.domain} · {item.difficulty}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: 12,
                        color: '#64748B',
                        background: '#F1F5F9',
                        borderRadius: 6,
                        padding: '2px 8px',
                      }}
                    >
                      {formatTime(item.timeSeconds)}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: item.isCorrect ? '#15803D' : '#BE123C',
                        background: item.isCorrect ? '#F0FDF4' : '#FFF1F2',
                        borderRadius: 6,
                        padding: '2px 8px',
                      }}
                    >
                      {item.isCorrect ? '정답' : '오답'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
