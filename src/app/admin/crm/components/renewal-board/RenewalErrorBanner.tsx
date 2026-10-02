'use client';

import type { PendingConversion } from './use-renewal-payment';

interface RenewalErrorBannerProps {
  error: string;
  pendingConversion: PendingConversion | null;
  onRetryConversion: (conversion: PendingConversion) => void;
  onClose: () => void;
}

export function RenewalErrorBanner({
  error,
  pendingConversion,
  onRetryConversion,
  onClose,
}: RenewalErrorBannerProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
      <span>{error}</span>
      <div className="flex shrink-0 items-center gap-2">
        {pendingConversion && (
          <button
            type="button"
            onClick={() => onRetryConversion(pendingConversion)}
            className="px-2 py-1 rounded-md font-semibold text-white bg-red-500 hover:bg-red-400 transition-colors"
          >
            결제 완료로 이동 재시도
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-red-400 hover:text-red-600"
          aria-label="오류 닫기"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
