'use client';

import type { WinbackCandidate } from '@/types/crm';

/**
 * 적합도 배지 — AI 판정은 **제외 기준이 아니라 우선순위**다(rank.ts 참고).
 * 그래서 낮은 fit도 목록에 남고, 여기서 시각적으로만 낮춰 보여준다.
 */
function FitBadge({ fit }: { fit: number | null }) {
  if (fit == null) {
    return <span className="text-[11px] text-gray-400">규칙 점수만</span>;
  }
  if (fit <= 2) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-gray-400">
        적합도 {fit}/5
        <span className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px]">근거 약함</span>
      </span>
    );
  }
  return (
    <span className={`text-[11px] ${fit >= 4 ? 'font-semibold text-blue-600' : 'text-blue-500'}`}>
      적합도 {fit}/5
    </span>
  );
}

/** 추천 후보 1건 — 점수·근거·규칙 신호를 함께 보여줘서 "왜 이 리드인가"가 눈에 보이게 한다. */
export function CandidateCard({
  candidate,
  checked,
  onToggle,
}: {
  candidate: WinbackCandidate;
  checked: boolean;
  onToggle: () => void;
}) {
  const positives = candidate.signals.filter((s) => s.delta > 0).slice(0, 4);
  const negatives = candidate.signals.filter((s) => s.delta < 0).slice(0, 2);
  const weak = candidate.llm_fit != null && candidate.llm_fit <= 2;

  return (
    <li
      className={`rounded-xl border p-2.5 transition-colors ${
        checked ? 'border-blue-300 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <label className="flex gap-2.5 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 accent-gray-900" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-400">#{candidate.rank}</span>
            <span className={`text-sm font-medium ${weak ? 'text-gray-500' : 'text-gray-900'}`}>
              {candidate.name}
            </span>
            <span className="text-[11px] text-gray-400">{candidate.grade}</span>
            <span className="text-[11px] font-semibold text-gray-700">{candidate.score}점</span>
            <FitBadge fit={candidate.llm_fit} />
            {candidate.churn_tag && (
              <span className="text-[11px] text-gray-400 truncate max-w-[180px]">
                {candidate.churn_tag}
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs text-gray-600">{candidate.reason}</p>

          {(positives.length > 0 || negatives.length > 0) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {positives.map((s) => (
                <span
                  key={s.key}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-50 text-emerald-700"
                >
                  {s.label}
                </span>
              ))}
              {negatives.map((s) => (
                <span key={s.key} className="px-1.5 py-0.5 text-[10px] rounded bg-orange-50 text-orange-700">
                  {s.label}
                </span>
              ))}
            </div>
          )}

          {candidate.last_memo && (
            <p className="mt-1 text-[11px] text-gray-400 truncate">최근 상담: {candidate.last_memo}</p>
          )}
        </div>
      </label>
    </li>
  );
}
