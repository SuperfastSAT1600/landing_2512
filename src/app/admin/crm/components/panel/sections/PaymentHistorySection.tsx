'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import type { Payment, Student } from '@/types/crm';
import { SectionCard } from './SectionCard';
import { PaymentModal } from '../../PaymentModal';

interface Props {
  student: Student;
  adminKey: string;
  onStudentUpdate: (updates: Partial<Student>) => void;
}

function formatAmount(n: number) {
  return '₩' + n.toLocaleString('ko-KR');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function PaymentHistorySection({ student, adminKey, onStudentUpdate }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/crm/payments?student_id=${student.id}`, {
      headers: { 'x-admin-key': adminKey },
    });
    const json = await res.json();
    setLoading(false);
    setPayments(json.data ?? []);
  }, [student.id, adminKey]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // paid_at 기준 가장 이른 결제 id → 최초결제
  const firstPaymentId = payments.length > 0
    ? [...payments].sort((a, b) => a.paid_at.localeCompare(b.paid_at))[0].id
    : null;

  // 화면엔 최신순
  const sorted = [...payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at));

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  async function handleDelete(id: string) {
    if (!confirm('이 결제 기록을 삭제할까요?')) return;
    setDeleting(id);
    const res = await fetch(`/api/crm/payments/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey },
    });
    if (res.ok) {
      setPayments(prev => prev.filter(p => p.id !== id));
    } else {
      alert('삭제에 실패했습니다.');
    }
    setDeleting(null);
  }

  return (
    <>
      <SectionCard
        title="결제 히스토리"
        count={payments.length}
        defaultOpen={false}
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={12} />결제 추가
          </button>
        }
      >
        {loading ? (
          <p className="text-xs text-gray-400 py-2">불러오는 중...</p>
        ) : payments.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">결제 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {/* 합계 */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="text-xs text-gray-400">총 결제액</span>
              <span className="text-sm font-bold text-gray-800">{formatAmount(totalAmount)}</span>
            </div>

            {sorted.map(p => {
              const isFirst = p.id === firstPaymentId;
              return (
                <div key={p.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isFirst
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isFirst ? '최초결제' : '재결제'}
                      </span>
                      <span className="text-[11px] text-gray-400">{formatDate(p.paid_at)}</span>
                    </div>
                    <p className="text-[13px] text-gray-700 font-medium truncate">{p.product}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[13px] font-semibold text-gray-900">{formatAmount(p.amount)}</span>
                      <span className="text-[11px] text-gray-400">{p.tax_type}</span>
                      {p.hours && (
                        <span className="text-[11px] text-gray-400">{p.hours}시간</span>
                      )}
                    </div>
                    {p.notes && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{p.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deleting === p.id}
                    className="shrink-0 mt-1 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {showModal && (
        <PaymentModal
          student={student}
          adminKey={adminKey}
          onConfirm={(updatedStudent) => {
            onStudentUpdate({ lead_status: updatedStudent.lead_status });
            setShowModal(false);
            fetchPayments();
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
