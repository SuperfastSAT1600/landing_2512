import type { VocabDiagnosisItem } from '@/lib/report-data';

interface Props {
  vocabResults: VocabDiagnosisItem[];
  weeksLeft?: number;
}

const TOTAL_VOCAB_POOL = 3618;

const BRACKETS: { min: number; max: number; scoreMin: number; scoreMax: number }[] = [
  { scoreMin: 19, scoreMax: 20, min: 300,  max: 600  },
  { scoreMin: 16, scoreMax: 18, min: 600,  max: 1200 },
  { scoreMin: 12, scoreMax: 15, min: 1200, max: 1900 },
  { scoreMin: 8,  scoreMax: 11, min: 1900, max: 2900 },
  { scoreMin: 0,  scoreMax: 7,  min: 2900, max: 3618 },
];

function calcVocabRecommendation(score: number) {
  const uncorrectedRate = (20 - score) / 20;
  const correctedRate = Math.min(1.0, uncorrectedRate / 0.75);
  const raw = Math.round((TOTAL_VOCAB_POOL * correctedRate) / 10) * 10;

  const bracket = BRACKETS.find(b => score >= b.scoreMin && score <= b.scoreMax)!;
  const recommended = Math.max(bracket.min, Math.min(bracket.max, raw));

  return { recommended, bracket, correctedRate };
}

export function ReportVocabDiagnosis({ vocabResults, weeksLeft }: Props) {
  const correctCount = vocabResults.filter(v => v.isCorrect).length;
  const totalCount = vocabResults.length;
  const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const { recommended, bracket } = calcVocabRecommendation(correctCount);
  const weeklyTarget = weeksLeft && weeksLeft > 0 ? Math.round(recommended / weeksLeft) : null;
  const weeklyWarning = weeklyTarget !== null && weeklyTarget > 250;

  const scoreColor =
    pct >= 80 ? '#03B26C' :
    pct >= 60 ? '#3182F6' :
    pct >= 40 ? '#F59E0B' : '#F04452';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Score header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
            Vocabulary Score
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black" style={{ color: scoreColor }}>
              {correctCount}
            </span>
            <span className="text-xl font-semibold text-slate-300">/ {totalCount}</span>
            <span
              className="ml-2 text-sm font-bold rounded-full px-2.5 py-0.5"
              style={{ background: `${scoreColor}18`, color: scoreColor }}
            >
              {pct}%
            </span>
          </div>
        </div>

        {/* Mini bar chart */}
        <div className="flex items-end gap-0.5 h-10">
          {vocabResults.map((v) => (
            <div
              key={v.wordId}
              className="w-1.5 rounded-t"
              style={{
                height: v.timeTaken !== undefined ? `${Math.max(20, Math.min(100, (1 - v.timeTaken / 10) * 80 + 20))}%` : '40%',
                background: v.selectedOptionId === null
                  ? '#E2E8F0'
                  : v.isCorrect
                    ? '#03B26C'
                    : '#F04452',
              }}
            />
          ))}
        </div>
      </div>

      {/* Word grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {vocabResults.map((v, idx) => {
            const isTimeout = v.selectedOptionId === null;
            const bgColor = isTimeout ? '#F8FAFC' : v.isCorrect ? '#F0FDF4' : '#FFF1F2';
            const borderColor = isTimeout ? '#E2E8F0' : v.isCorrect ? '#BBF7D0' : '#FECDD3';
            const textColor = isTimeout ? '#94A3B8' : v.isCorrect ? '#15803D' : '#BE123C';
            const iconColor = isTimeout ? '#94A3B8' : v.isCorrect ? '#22C55E' : '#F43F5E';

            return (
              <div
                key={v.wordId}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 border"
                style={{ background: bgColor, borderColor }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-slate-300 flex-shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="text-sm font-semibold truncate"
                    style={{ color: textColor }}
                  >
                    {v.word}
                  </span>
                </div>
                <span className="flex-shrink-0 ml-1 text-sm" style={{ color: iconColor }}>
                  {isTimeout ? '—' : v.isCorrect ? '✓' : '✗'}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-300 mt-4 pt-3 border-t border-slate-50">
          ✓ correct · ✗ incorrect · — no answer (time expired)
        </p>
      </div>

      {/* Recommendation card */}
      <div className="mx-5 mb-5 rounded-xl border border-slate-100 bg-slate-50/60 px-5 py-4 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Vocabulary Recommendation
        </p>

        {/* Main number */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black" style={{ color: scoreColor }}>
            {recommended.toLocaleString()}
          </span>
          <span className="text-sm text-slate-400">단어 추가 학습 권장</span>
        </div>

        {/* One-liner */}
        <p className="text-[12px] text-slate-600 leading-relaxed">
          20개 중 <span className="font-semibold">{correctCount}개</span> 정답({pct}%)으로,
          추측 보정 후 SAT 핵심 어휘 {TOTAL_VOCAB_POOL.toLocaleString()}개 중{' '}
          <span className="font-semibold">{recommended.toLocaleString()}개</span>를
          집중적으로 학습하는 것을 권장합니다.
          <span className="text-slate-400">
            {' '}(권장 범위 {bracket.min.toLocaleString()}–{bracket.max.toLocaleString()}개)
          </span>
        </p>

        {/* Weekly pacing */}
        {weeklyTarget !== null && (
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-[11px] leading-relaxed"
            style={{
              background: weeklyWarning ? '#FFF7ED' : '#F0FDF4',
              color: weeklyWarning ? '#C2410C' : '#15803D',
            }}
          >
            <span className="flex-shrink-0 font-bold">{weeklyWarning ? '⚠' : '✓'}</span>
            <span>
              {weeksLeft}주 남은 기준, 주당{' '}
              <span className="font-bold">{weeklyTarget.toLocaleString()}개</span> 학습 필요.
              {weeklyWarning
                ? ' 주당 250개를 초과합니다 — 학습 기간을 늘리거나 우선순위 단어 위주로 압축하세요.'
                : ' 충분히 달성 가능한 페이스입니다.'}
            </span>
          </div>
        )}

        {/* Formula note */}
        <p className="text-[10px] text-slate-300 pt-1 border-t border-slate-100">
          계산: 오답률 ÷ 0.75(추측 보정) × {TOTAL_VOCAB_POOL.toLocaleString()} · 점수 구간 클램프 적용 · 학습 순서: 빈출 고난도 → 중간 → 기본 순
        </p>
      </div>
    </div>
  );
}
