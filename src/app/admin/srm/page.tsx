'use client';

import { useState } from 'react';
import { TutoringUserList } from './components/TutoringUserList';
import { StudentPanel } from './components/StudentPanel';
import type { TutoringStatus } from '@/app/api/admin/srm/tutoring-users/route';

interface SelectedStudent {
  id?: string;
  crmStudentId?: string;
  name: string;
  tutoringStatus?: TutoringStatus;
  remainingHours?: number;
  purchasedHours?: number;
}

export default function SrmPage() {
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);
  const [tutoringRefreshKey, setTutoringRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="p-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">SRM — 튜터링 유저</h1>
        </div>

        <TutoringUserList
          onStudentClick={setSelectedStudent}
          refreshKey={tutoringRefreshKey}
        />

        {selectedStudent && (
          <StudentPanel
            studentId={selectedStudent.id}
            crmStudentId={selectedStudent.crmStudentId}
            studentName={selectedStudent.name}
            onClose={() => setSelectedStudent(null)}
            onLinked={() => setTutoringRefreshKey((k) => k + 1)}
            tutoringStatus={selectedStudent.tutoringStatus}
            remainingHours={selectedStudent.remainingHours}
            purchasedHours={selectedStudent.purchasedHours}
          />
        )}
      </div>
    </div>
  );
}
