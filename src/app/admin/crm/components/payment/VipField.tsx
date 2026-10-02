import { Crown } from 'lucide-react';
import { VIP_REASON_LABELS, VIP_REASON_COLORS, type VipReason } from '@/lib/vip-utils';

/** Step 3: VIP 여부 체크와 자동 감지 사유. */
export function VipField({
  isVip, setIsVip, detectedReasons,
}: {
  isVip: boolean;
  setIsVip: (updater: (v: boolean) => boolean) => void;
  detectedReasons: VipReason[];
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
        <div
          onClick={() => setIsVip(v => !v)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isVip ? 'bg-amber-400 border-amber-400' : 'border-gray-300 hover:border-amber-300'
          }`}
        >
          {isVip && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <span className={`text-xs font-semibold ${isVip ? 'text-amber-600' : 'text-gray-500'}`}>
          VIP 학생
        </span>
        {isVip && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold tracking-wide">
            <Crown size={9} />VIP
          </span>
        )}
      </label>
      {detectedReasons.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pl-7">
          <span className="text-[10px] text-gray-400">자동 감지</span>
          {detectedReasons.map(reason => (
            <span
              key={reason}
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${VIP_REASON_COLORS[reason]}`}
            >
              {VIP_REASON_LABELS[reason]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
