import { PAYMENT_METHODS } from '@/types/crm';
import type { PaymentMethod } from '@/types/crm';
import { netAmount } from '@/lib/payment-utils';

interface PaymentFieldsProps {
  amount: string;
  setAmount: (v: string) => void;
  hasAmount: boolean;
  isProvisional: boolean;
  amountValue: number;
  taxType: '면세' | '과세';
  setTaxType: (t: '면세' | '과세') => void;
  paymentMethod: PaymentMethod | null;
  setPaymentMethod: (updater: (prev: PaymentMethod | null) => PaymentMethod | null) => void;
}

/** Step 3: 결제 금액 · 세금 유형 · 결제수단. */
export function PaymentFields({
  amount, setAmount, hasAmount, isProvisional, amountValue,
  taxType, setTaxType, paymentMethod, setPaymentMethod,
}: PaymentFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">결제 금액</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">₩</span>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="예: 2990000 (가결제는 0)"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-blue-400"
          />
        </div>
        {hasAmount && (
          <p className={`text-[11px] ${isProvisional ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
            {isProvisional
              ? '0원 · 가결제 (수업 시작, 실입금 전)'
              : `${amountValue.toLocaleString('ko-KR')}원`}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">세금 유형</label>
        <div className="flex gap-2">
          {(['면세', '과세'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTaxType(t)}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                taxType === t
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {hasAmount && (
          <p className="text-[11px] text-gray-400">
            수익:{' '}
            <span className="font-medium text-gray-700">
              {netAmount({ amount: amountValue, tax_type: taxType }).toLocaleString('ko-KR')}원
            </span>
            {taxType === '과세' && <span className="ml-1 text-gray-400">(부가세 10% 제외)</span>}
          </p>
        )}
      </div>

      {/* 결제수단 — 선택 사항. 모르면 비워두는 게 낫다(예전 기본값 '계좌이체'가
          실제 계좌이체인지 미입력인지 구분이 안 돼 574건이 무의미해졌다). */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">
          결제수단 <span className="text-gray-300">(선택)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setPaymentMethod((prev) => (prev === m ? null : m))}
              className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                paymentMethod === m
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400">
          모르면 비워두세요 — 추측해서 고르면 집계가 틀어집니다.
        </p>
      </div>
    </>
  );
}
