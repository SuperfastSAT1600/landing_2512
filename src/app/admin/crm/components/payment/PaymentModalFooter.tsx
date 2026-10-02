interface PaymentModalFooterProps {
  step: -1 | 0 | 1 | 2 | 3 | 4;
  isValid: boolean;
  loading: boolean;
  recorded: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onFinish: () => void;
}

/** 모달 하단 — 3단계(결제 완료)와 4단계(링크 확인 후 완료) 버튼. */
export function PaymentModalFooter({
  step, isValid, loading, recorded, onClose, onConfirm, onFinish,
}: PaymentModalFooterProps) {
  if (step === 3) {
    return (
      <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          onClick={onConfirm}
          disabled={!isValid || loading}
          className="flex-1 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '처리 중...' : recorded ? '수업 중 전환 다시 시도' : '결제 완료'}
        </button>
      </div>
    );
  }
  if (step === 4) {
    return (
      <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
        <button
          onClick={onFinish}
          className="flex-1 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          완료
        </button>
      </div>
    );
  }
  return null;
}
