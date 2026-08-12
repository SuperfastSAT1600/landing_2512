'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import type { Payment, Student } from '@/types/crm';
import { SectionCard } from './SectionCard';
import { PaymentModal } from '../../PaymentModal';
import { PaymentHistoryRow, type PaymentEdits } from './PaymentHistoryRow';

interface Props {
  student: Student;
  adminKey: string;
  onStudentUpdate: (updates: Partial<Student>) => void;
}

function formatAmount(n: number) {
  return '₩' + n.toLocaleString('ko-KR');
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPayments(); }, []);

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

  // 금액·시간 수정 — 가결제(0원)를 실입금액으로 보정할 때 쓴다.
  async function handleSaveEdits(id: string, edits: PaymentEdits): Promise<boolean> {
    const prev = payments;
    setPayments(ps => ps.map(p => (p.id === id ? { ...p, ...edits } : p)));
    const res = await fetch(`/api/crm/payments/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(edits),
    });
    if (!res.ok) {
      setPayments(prev); // 롤백
      const json = await res.json().catch(() => null);
      alert(json?.error ?? '결제 수정에 실패했습니다.');
      return false;
    }
    return true;
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

            {sorted.map(p => (
              <PaymentHistoryRow
                key={p.id}
                payment={p}
                savingType={savingType}
                deleting={deleting === p.id}
                onTypeChange={handleTypeChange}
                onDelete={handleDelete}
                onSave={handleSaveEdits}
              />
            ))}
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
