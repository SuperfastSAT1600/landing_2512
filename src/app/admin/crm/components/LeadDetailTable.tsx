'use client';

import type { LeadDetailItem } from '@/lib/crm-stats-detail';
import { FUNNEL_STAGE_LABELS, type FunnelStage } from '@/types/crm';

export const stageLabel = (stage: string) =>
  FUNNEL_STAGE_LABELS[stage as FunnelStage] ?? stage;

// 리드 상태를 3-상태(세일즈 중/결제/이탈)로 단순화 — active/inactive 원시값 대신 뱃지로 표시
export type LeadDisplayStatus = '세일즈 중' | '결제' | '이탈';
export const leadStatus = (
  it: Pick<LeadDetailItem, 'lead_status' | 'funnel_stage' | 'is_paid'>
): LeadDisplayStatus => {
  if (it.lead_status === 'inactive' || it.funnel_stage === 'churned') return '이탈';
  // 결제 판정: 기간 내 최초결제 행(is_paid)뿐 아니라 학생의 등록 상태도 권위 신호로 사용.
  // 리드/결제가 같은 기간 창으로 필터되므로, 결제일이 창을 벗어난 등록 유저(수강 중)를
  // is_paid만으로는 놓친다 → lead_status='enrolled' 또는 수업 중(단계 8)이면 결제로 본다.
  if (it.is_paid || it.lead_status === 'enrolled' || it.funnel_stage === '8') return '결제';
  return '세일즈 중';
};
export const STATUS_BADGE: Record<LeadDisplayStatus, string> = {
  '세일즈 중': 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  '결제': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  '이탈': 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};

// 문의일(date) 오름차순 정렬 — date 없는 행은 뒤로
export const byInquiryDateAsc = (a: LeadDetailItem, b: LeadDetailItem) => {
  if (!a.date) return 1;
  if (!b.date) return -1;
  return a.date.localeCompare(b.date);
};

export const kstDate = (s: string) =>
  new Date(s).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' });

interface Props {
  items: LeadDetailItem[];
  onSelectStudent?: (id: string) => void; // 있으면 이름 클릭 시 호출(상세 패널 열기)
  onRowClick?: () => void; // 이름 클릭 후 부가 동작(예: 모달 닫기)
}

/** 리드 드릴다운 표 — 세일즈 로직 통계·소스 통계 등에서 공유. */
export function LeadDetailTable({ items, onSelectStudent, onRowClick }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-500">
            <th className="text-left py-2 pr-3 font-semibold">이름</th>
            <th className="text-left py-2 px-3 font-semibold">유입 소스</th>
            <th className="text-left py-2 px-3 font-semibold">단계</th>
            <th className="text-left py-2 px-3 font-semibold">상태</th>
            <th className="text-left py-2 px-3 font-semibold">이탈 사유</th>
            <th className="text-right py-2 px-3 font-semibold">문의일</th>
            <th className="text-right py-2 pl-3 font-semibold">첫 상담메모일</th>
          </tr>
        </thead>
        <tbody>
          {[...items].sort(byInquiryDateAsc).map((it) => {
            const status = leadStatus(it);
            return (
              <tr key={it.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                <td className="py-2 pr-3 font-medium whitespace-nowrap">
                  {onSelectStudent ? (
                    <button
                      type="button"
                      onClick={() => { onSelectStudent(it.id); onRowClick?.(); }}
                      className="text-blue-700 hover:underline focus:outline-none focus:underline"
                    >
                      {it.name}
                    </button>
                  ) : (
                    <span className="text-gray-800">{it.name}</span>
                  )}
                </td>
                <td className="py-2 px-3 text-gray-600 whitespace-nowrap">{it.traffic_source ?? '-'}</td>
                <td className="py-2 px-3 text-gray-600">{stageLabel(it.funnel_stage)}</td>
                <td className="py-2 px-3">
                  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
                    {status}
                  </span>
                </td>
                <td className="py-2 px-3 text-gray-600">{it.churn_tag ?? '-'}</td>
                <td className="py-2 px-3 text-right text-gray-500 tabular-nums whitespace-nowrap">{it.date ? kstDate(it.date) : '-'}</td>
                <td className="py-2 pl-3 text-right text-gray-500 tabular-nums whitespace-nowrap">{it.first_memo_at ? kstDate(it.first_memo_at) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
