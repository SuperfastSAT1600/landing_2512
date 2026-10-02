import { ArrowRight } from 'lucide-react';

interface LeadPoolBannersProps {
  bulkSuccessMessage: string | null;
  onDismissSuccess: () => void;
  retryContext?: { id: string; name: string } | null;
  onRetryContextClear?: () => void;
}

export function LeadPoolBanners({
  bulkSuccessMessage,
  onDismissSuccess,
  retryContext,
  onRetryContextClear,
}: LeadPoolBannersProps) {
  return (
    <>
      {/* Bulk success banner */}
      {bulkSuccessMessage && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-sm font-medium text-emerald-700">{bulkSuccessMessage}</p>
          <button
            type="button"
            onClick={onDismissSuccess}
            className="text-xs text-emerald-500 hover:text-emerald-700"
          >
            닫기
          </button>
        </div>
      )}

      {/* Retry strategy context banner */}
      {retryContext && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2">
            <ArrowRight size={14} className="text-blue-500" />
            <p className="text-sm text-blue-700">
              <span className="font-semibold">{retryContext.name}</span> 전략으로 배정 중 — 리드를
              선택하세요
            </p>
          </div>
          <button
            type="button"
            onClick={onRetryContextClear}
            className="text-xs text-blue-400 hover:text-blue-600 transition-colors"
          >
            해제
          </button>
        </div>
      )}
    </>
  );
}
