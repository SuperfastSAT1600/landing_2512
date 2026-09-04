'use client';

import { Trash2 } from 'lucide-react';
import { GLOBAL_SALE_BILLING_TYPES } from '@/lib/global-sales-types';
import type { GlobalSaleEntry, GlobalSalePaymentType, GlobalSaleBillingType } from '@/lib/global-sales-types';
import { CountryPicker } from './CountryPicker';

const PAYMENT_BADGE: Record<GlobalSalePaymentType, string> = {
  최초결제: 'bg-emerald-50 text-emerald-600',
  재결제: 'bg-blue-50 text-blue-600',
};

interface Props {
  entries: GlobalSaleEntry[];
  formatAmount: (n: number) => string;
  /** 국가·결제 방식은 행에서 바로 고친다 — 컬럼 도입 이전 기록을 채워 넣기 위함. */
  onPatch: (id: string, updates: Partial<GlobalSaleEntry>) => void;
  onRemove: (id: string, studentName: string) => void;
}

export function GlobalSalesTable({ entries, formatAmount, onPatch, onRemove }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400">이름</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">국가</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">유형</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">결제 방식</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">금액</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-gray-400">날짜</th>
            <th className="py-2 pl-2" />
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
              <td className="py-2.5 pr-4 text-xs font-medium text-gray-800">{e.student_name}</td>
              <td className="py-2.5 px-2 text-xs">
                <CountryPicker
                  label="국가 변경"
                  value={e.country_code}
                  onChange={(code) => onPatch(e.id, { country_code: code })}
                  placeholder="미지정"
                  allowClear
                />
              </td>
              <td className="py-2.5 px-2">
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${PAYMENT_BADGE[e.payment_type]}`}>
                  {e.payment_type}
                </span>
              </td>
              <td className="py-2.5 px-2">
                <select
                  aria-label="결제 방식 변경"
                  value={e.billing_type}
                  onChange={(ev) => onPatch(e.id, { billing_type: ev.target.value as GlobalSaleBillingType })}
                  className="text-[11px] text-gray-600 bg-transparent rounded px-1 -mx-1 hover:bg-blue-50 focus:outline-none"
                >
                  {GLOBAL_SALE_BILLING_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td className="text-right py-2.5 px-2 text-xs font-medium text-gray-700 tabular-nums">
                {formatAmount(e.amount_usd)}
              </td>
              <td className="text-right py-2.5 px-2 text-xs text-gray-400 tabular-nums">{e.sale_date}</td>
              <td className="py-2.5 pl-2 text-right">
                <button
                  onClick={() => onRemove(e.id, e.student_name)}
                  aria-label="삭제"
                  className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
