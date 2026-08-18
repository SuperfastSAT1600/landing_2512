'use client';

import { useState, useCallback } from 'react';
import type { ParentStudentView } from '@/types/crm';
import { StatusBadge } from './StatusBadge';
import { ScheduleInput } from './ScheduleInput';

interface Props {
  data: ParentStudentView;
  studentId: string;
  passcode: string;
}

function formatDatetime(isoString: string): string {
  return new Date(isoString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ParentDashboard({ data, studentId, passcode }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentData, setCurrentData] = useState(data);

  const handleScheduleSaved = useCallback(async () => {
    try {
      const res = await fetch(`/api/mypage/${studentId}`, {
        headers: { 'X-Passcode': passcode },
      });
      if (res.ok) {
        const { data: updated } = await res.json();
        if (updated) setCurrentData(updated);
      }
    } catch {
      // Silently fail; user can refresh manually
    }
    setRefreshKey((k) => k + 1);
  }, [studentId, passcode]);

  const publishedTimeline = currentData.timeline.filter((entry) => entry.ai_purified);
  const sortedTimeline = [...publishedTimeline].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                학생 마이페이지
              </p>
              <h1 className="text-xl font-bold text-gray-900">{currentData.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{currentData.grade}</p>
            </div>
            <StatusBadge status={currentData.parent_status} key={refreshKey} />
          </div>
        </div>

        {/* Schedule input — only when status is 'schedule' */}
        {currentData.parent_status === 'schedule' && (
          <ScheduleInput
            studentId={studentId}
            passcode={passcode}
            onSaved={handleScheduleSaved}
          />
        )}

        {/* Diagnostic result card */}
        {currentData.diagnostic_result_id && (
          <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              진단 결과
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              아이의 SAT 진단 결과가 준비되었습니다.
            </p>
            <a
              href={`/reports/${currentData.diagnostic_result_id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              진단 결과 보기 →
            </a>
          </div>
        )}

        {/* Consultation timeline */}
        {sortedTimeline.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              상담 내용
            </h2>
            <div className="space-y-4">
              {sortedTimeline.map((entry) => (
                <div key={entry.id} className="border-l-2 border-blue-200 pl-4">
                  <p className="text-xs text-gray-400 mb-1">{formatDatetime(entry.created_at)}</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {entry.ai_purified}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {sortedTimeline.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
            <p className="text-gray-400 text-sm">아직 상담 내용이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
