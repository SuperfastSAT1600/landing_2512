'use client';

import { useCallback, useState } from 'react';
import { useAdminAuth } from '@/lib/useAdminAuth';
import type { Student } from '@/types/crm';
import { SalesStats } from './components/SalesStats';
import { StudentDetailPanel } from '../crm/components/StudentDetailPanel';

// CRM 리드 현황·통계의 '통계' 서브탭을 분리한 최상위 페이지.
// SalesStats는 adminKey 외 어떤 CRM 페이지 상태에도 의존하지 않으므로 그대로 마운트한다.
export default function BusinessPage() {
  const { adminKey } = useAdminAuth();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // 유입 소스별 성과 표에서 리드 이름 클릭 → id로 학생을 조회해 상세 패널을 연다.
  const handleSelectStudentById = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/crm/students/${id}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      if (res.ok && json.data) setSelectedStudent(json.data as Student);
    } catch {
      /* 무시: 패널이 열리지 않을 뿐 */
    }
  }, [adminKey]);

  const handleStudentUpdate = useCallback(async (id: string, updates: Partial<Student>) => {
    setSelectedStudent((prev) => (prev?.id === id ? { ...prev, ...updates } : prev));
    try {
      const res = await fetch(`/api/crm/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error?.message ?? '업데이트에 실패했습니다.');
      }
    } catch {
      /* 무시: 낙관적 반영 유지, 다음 새로고침에서 정정됨 */
    }
  }, [adminKey]);

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans overflow-x-hidden">
      <div className="sticky top-12 md:top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-lg font-semibold text-gray-900">Business</h1>
      </div>

      <div className="px-4 py-4 sm:px-8 sm:py-6">
        <SalesStats adminKey={adminKey} onSelectStudent={handleSelectStudentById} />
      </div>

      {selectedStudent && (
        <StudentDetailPanel
          student={selectedStudent}
          adminKey={adminKey}
          onClose={() => setSelectedStudent(null)}
          onUpdate={handleStudentUpdate}
        />
      )}
    </div>
  );
}
