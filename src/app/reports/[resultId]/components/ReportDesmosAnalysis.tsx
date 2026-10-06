import { DESMOS_SLOW_THRESHOLD_SECONDS, type DesmosAnalysisItem, type DesmosFlag } from '@/lib/report-data';

interface Props {
  desmosAnalysis: DesmosAnalysisItem[];
}

const FLAG_CONFIG: Record<DesmosFlag, {
  labelKo: string;
  desc: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}> = {
  MISSING_DESMOS: {
    labelKo: 'Desmos 미활용',
    desc: 'Desmos로 빠르게 풀 수 있는 문항을 손으로 풀었습니다.',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1D4ED8',
    dot: '#3B82F6',
  },
  UNNECESSARY_DESMOS: {
    labelKo: '불필요한 Desmos',
    desc: '직접 푸는 편이 빠른 문항에 Desmos를 사용했습니다.',
    bg: '#FFF7ED',
    border: '#FED7AA',
    text: '#C2410C',
    dot: '#F97316',
  },
  SLOW_WITH_DESMOS: {
    labelKo: 'Desmos 사용 후 시간 초과',
    desc: `Desmos를 쓰고도 ${DESMOS_SLOW_THRESHOLD_SECONDS / 60}분 넘게 걸렸습니다. 입력·해석 방법을 점검할 필요가 있습니다.`,
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#BE123C',
    dot: '#F43F5E',
  },
};

const FLAG_ORDER: DesmosFlag[] = ['MISSING_DESMOS', 'UNNECESSARY_DESMOS', 'SLOW_WITH_DESMOS'];

function formatTime(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

export function ReportDesmosAnalysis({ desmosAnalysis }: Props) {
  const flagged = desmosAnalysis.filter((q) => q.flags.length > 0);
  const usedCount = desmosAnalysis.filter((q) => q.desmosUsed).length;
  const recommendedCount = desmosAnalysis.filter((q) => q.desmosRecommended).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 leading-relaxed">
        수학 {desmosAnalysis.length}문항 중 Desmos 권장 문항은 {recommendedCount}개, 실제로 Desmos를 사용한 문항은 {usedCount}개입니다.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {FLAG_ORDER.map((flag) => {
          const cfg = FLAG_CONFIG[flag];
          const count = desmosAnalysis.filter((q) => q.flags.includes(flag)).length;
          return (
            <div
              key={flag}
              className="rounded-xl border p-4"
              style={{ background: cfg.bg, borderColor: cfg.border }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                <span className="text-sm font-semibold" style={{ color: cfg.text }}>{cfg.labelKo}</span>
              </div>
              <p className="mt-2 text-2xl font-bold" style={{ color: cfg.text }}>{count}<span className="text-sm font-medium ml-1">문항</span></p>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">{cfg.desc}</p>
            </div>
          );
        })}
      </div>

      {flagged.length === 0 ? (
        <p className="text-sm text-gray-600 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          {recommendedCount === 0 && usedCount === 0
            ? '이번 시험에는 Desmos 활용이 필요한 문항이 없었습니다.'
            : '모든 수학 문항에서 Desmos를 적절히 활용했습니다.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
          {flagged.map((q) => (
            <li key={q.questionId} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="text-sm font-semibold text-gray-800 w-12">Q{q.questionNumber}</span>
              <span className="text-xs text-gray-500 flex-1 min-w-[8rem]">{q.skill}</span>
              <span className="text-xs text-gray-500 tabular-nums">{formatTime(q.timeSeconds)}</span>
              <span className={`text-xs font-medium ${q.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                {q.isCorrect ? '정답' : '오답'}
              </span>
              {q.flags.map((flag) => (
                <span
                  key={flag}
                  className="text-[11px] font-medium rounded-full px-2 py-0.5 border"
                  style={{ background: FLAG_CONFIG[flag].bg, borderColor: FLAG_CONFIG[flag].border, color: FLAG_CONFIG[flag].text }}
                >
                  {FLAG_CONFIG[flag].labelKo}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
