import { X, CreditCard, ChevronLeft } from 'lucide-react';

const STEP_LABELS: Record<number, string> = {
  [-1]: '파트너 선택',
  0: '결제 유형',
  1: '수업 유형',
  2: '과목',
  3: '상품 선택',
};

interface PaymentModalHeaderProps {
  step: -1 | 0 | 1 | 2 | 3 | 4;
  hasPartnerStep: boolean;
  onBack: () => void;
  onClose: () => void;
  onFinish: () => void;
}

/** 모달 상단 — 제목·단계 라벨·진행 막대. */
export function PaymentModalHeader({ step, hasPartnerStep, onBack, onClose, onFinish }: PaymentModalHeaderProps) {
  const stepLabel = STEP_LABELS[step] ?? '회원가입 링크';

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {step > 0 && step < 4 && (
            <button onClick={onBack} className="mr-1 text-gray-400 hover:text-gray-600">
              <ChevronLeft size={16} />
            </button>
          )}
          <CreditCard size={16} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900">결제 완료 처리</h2>
          <span className="text-xs text-gray-400 font-normal">· {stepLabel}</span>
        </div>
        <button onClick={step === 4 ? onFinish : onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex px-5 pt-3 gap-1">
        {(hasPartnerStep ? [-1, 0, 1, 2, 3] : [0, 1, 2, 3]).map(s => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-blue-500' : 'bg-gray-100'
            }`}
          />
        ))}
      </div>
    </>
  );
}
