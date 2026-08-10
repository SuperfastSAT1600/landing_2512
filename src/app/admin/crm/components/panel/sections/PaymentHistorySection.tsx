'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
  const [savingType, setSavingType] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/crm/payments?student_id=${student.id}&student_name=${encodeURIComponent(student.name)}`, {
      headers: { 'x-admin-key': adminKey },
    });
    const json = await res.json();
    setLoading(false);
    setPayments(json.data ?? []);
  }, [student.id, student.name, adminKey]);

  // 학생 변경 시 결제 내역 페치(fetchPayments가 로딩 플래그 동기 설정) — 의도된 페치
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // 화면엔 최신순
  const sorted = [...payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at));

  // 결제 유형(최초/재결제) 수정 — 통계가 쓰는 저장값(payment_type)을 직접 갱신
  async function handleTypeChange(id: string, newType: string) {
    const prev = payments;
    setSavingType(id);
    setPayments(ps => ps.map(p => (p.id === id ? { ...p, payment_type: newType } : p)));
    const res = await fetch(`/api/crm/payments/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_type: newType }),
    });
    if (!res.ok) {
      setPayments(prev); // 롤백
      alert('결제 유형 변경에 실패했습니다.');
    }
    setSavingType(null);
  }

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
              <span className="text-sm font-semibold text-gray-800">{formatAmount(totalAmount)}</span>
            </div>

            {sorted.map(p => {
              const isRefund = p.payment_type === '환불';
              const type = p.payment_type ?? '최초결제';
              const typeColor = type === '최초결제'
                ? 'bg-blue-100 text-blue-700'
                : type === '재결제'
                ? 'bg-gray-100 text-gray-500'
                : 'bg-violet-100 text-violet-700'; // 원포인트
              return (
                <div key={p.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {isRefund ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">환불</span>
                      ) : (
                        <select
                          value={type}
                          disabled={savingType === p.id}
                          onChange={(e) => handleTypeChange(p.id, e.target.value)}
                          title="결제 유형 (통계 반영) — 변경하려면 선택"
                          className={`text-[10px] font-semibold pl-1.5 pr-0.5 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${typeColor} disabled:opacity-50`}
                        >
                          <option value="최초결제">최초결제</option>
                          <option value="재결제">재결제</option>
                          {type === '원포인트' && <option value="원포인트">원포인트</option>}
                        </select>
                      )}
                      <span className="text-[11px] text-gray-400">{formatDate(p.paid_at)}</span>
                    </div>
                    <p className="text-[13px] text-gray-700 font-medium truncate">{p.product}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[13px] font-semibold ${isRefund ? 'text-red-500' : 'text-gray-900'}`}>
                        {isRefund ? `-${formatAmount(-p.amount)}` : formatAmount(p.amount)}
                      </span>
                      {!isRefund && <span className="text-[11px] text-gray-400">{p.tax_type}</span>}
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
            onStudentUpdate({ lead_status: updatedStudent.lead_status, funnel_stage: updatedStudent.funnel_stage });
            setShowModal(false);
            fetchPayments();
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
