'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageSquare, ArrowRight, Target, RefreshCw, CreditCard, Send } from 'lucide-react';
import type { Student, Payment } from '@/types/crm';
import { buildActivityFeed, type ActivityItem, type ActivityKind, type FeedPayment } from '@/lib/activity-feed';
import { SectionCard } from './SectionCard';

interface Props {
  student: Student;
  adminKey: string;
}

const ICON: Record<ActivityKind, React.ElementType> = {
  memo: MessageSquare,
  stage: ArrowRight,
  strategy: Target,
  reactivation: RefreshCw,
  payment: CreditCard,
  first_message: Send,
};

const ICON_COLOR: Record<ActivityKind, string> = {
  memo: 'text-gray-400',
  stage: 'text-blue-500',
  strategy: 'text-indigo-500',
  reactivation: 'text-amber-500',
  payment: 'text-emerald-500',
  first_message: 'text-gray-400',
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = sameYear
    ? `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
    : `${String(d.getFullYear()).slice(2)}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  // 자정이면 시각 생략
  const hm = d.getHours() === 0 && d.getMinutes() === 0 ? '' : ` ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return date + hm;
}

export function ActivityFeedSection({ student, adminKey }: Props) {
  const [payments, setPayments] = useState<FeedPayment[]>([]);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/payments?student_id=${student.id}&student_name=${encodeURIComponent(student.name)}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      const rows: Payment[] = json.data ?? [];
      setPayments(rows.map((p) => ({ amount: p.amount, payment_type: p.payment_type, product: p.product, paid_at: p.paid_at })));
    } catch {
      setPayments([]);
    }
  }, [student.id, student.name, adminKey]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const feed: ActivityItem[] = useMemo(() => buildActivityFeed(student, payments), [student, payments]);

  return (
    <SectionCard title="활동 타임라인" count={feed.length} defaultOpen={false}>
      {feed.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">활동 기록이 없습니다.</p>
      ) : (
        <ol className="relative space-y-3">
          {feed.map((it, i) => {
            const Icon = ICON[it.kind];
            return (
              <li key={`${it.kind}-${it.at}-${i}`} className="flex gap-2.5">
                <div className="flex flex-col items-center shrink-0">
                  <Icon size={13} className={ICON_COLOR[it.kind]} />
                  {i < feed.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                </div>
                <div className="min-w-0 flex-1 pb-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-gray-800">{it.title}</span>
                    <span className="text-[11px] text-gray-400 tabular-nums shrink-0">{fmtWhen(it.at)}</span>
                  </div>
                  {it.detail && <p className="text-[12px] text-gray-600 mt-0.5 whitespace-pre-wrap break-words line-clamp-4">{it.detail}</p>}
                  {it.meta && <p className="text-[11px] text-gray-400 mt-0.5">{it.meta}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}
