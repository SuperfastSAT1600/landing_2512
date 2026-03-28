'use client';

import { useState, useEffect, useCallback } from 'react';

interface ApplicationsTabProps {
  adminKey: string;
  onIssueCode?: (name: string, phone: string) => void;
}

interface Application {
  id: string;
  name: string;
  phone: string;
  preferred_date: string;
  preferred_time: string;
  status: 'pending' | 'contacted' | 'code_issued' | 'cancelled';
  notes: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<Application['status'], { text: string; color: string }> = {
  pending:     { text: '대기중',   color: 'bg-yellow-500/20 text-yellow-400' },
  contacted:   { text: '연락됨',   color: 'bg-blue-500/20 text-blue-400' },
  code_issued: { text: '코드발급', color: 'bg-green-500/20 text-green-400' },
  cancelled:   { text: '취소',     color: 'bg-red-500/20 text-red-400' },
};

const NEXT_STATUSES: Record<Application['status'], Application['status'][]> = {
  pending:     ['contacted', 'cancelled'],
  contacted:   ['code_issued', 'cancelled'],
  code_issued: ['cancelled'],
  cancelled:   ['pending'],
};

export function ApplicationsTab({ adminKey, onIssueCode }: ApplicationsTabProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/diagnosis/applications', {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const updateStatus = async (id: string, status: Application['status']) => {
    setUpdatingId(id);
    try {
      await fetch('/api/admin/diagnosis/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id, status }),
      });
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch {
      // silently fail
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('ko-KR');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">진단테스트 신청 목록</h2>
        <button
          onClick={fetchApplications}
          disabled={loading}
          className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? '로딩...' : '새로고침'}
        </button>
      </div>

      {applications.length === 0 && !loading && (
        <p className="text-gray-400">신청 내역이 없습니다.</p>
      )}

      {applications.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-3 px-3 font-semibold">이름</th>
                <th className="text-left py-3 px-3 font-semibold">전화번호</th>
                <th className="text-left py-3 px-3 font-semibold">희망 날짜/시간</th>
                <th className="text-left py-3 px-3 font-semibold">신청일</th>
                <th className="text-left py-3 px-3 font-semibold">상태</th>
                <th className="text-left py-3 px-3 font-semibold">액션</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const statusInfo = STATUS_LABELS[app.status];
                return (
                  <tr key={app.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-3 font-medium">{app.name}</td>
                    <td className="py-3 px-3 font-mono text-gray-300">{app.phone}</td>
                    <td className="py-3 px-3 text-gray-300">
                      <div>{app.preferred_date}</div>
                      <div className="text-xs text-gray-500">{app.preferred_time}</div>
                    </td>
                    <td className="py-3 px-3 text-gray-400 text-xs">{formatDate(app.created_at)}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1.5">
                        {NEXT_STATUSES[app.status].map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => updateStatus(app.id, nextStatus)}
                            disabled={updatingId === app.id}
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {STATUS_LABELS[nextStatus].text}
                          </button>
                        ))}
                        {app.status !== 'code_issued' && app.status !== 'cancelled' && onIssueCode && (
                          <button
                            onClick={() => onIssueCode(app.name, app.phone)}
                            className="px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs font-semibold transition-colors"
                          >
                            코드 발급 →
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
