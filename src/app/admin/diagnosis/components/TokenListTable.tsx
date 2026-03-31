'use client';

import { useState } from 'react';
import { TimezoneSelect } from '@/components/admin/TimezoneSelect';
import { localToUTC, utcToLocal, getTimezoneAbbr } from '@/lib/timezone-utils';

export interface CodeRecord {
  id: string;
  token: string;
  student_name: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  status: 'pending' | 'completed' | 'expired';
  test_version_id?: string | null;
}

export interface TestVersion {
  id: string;
  version_number: number;
  is_current: boolean;
}

interface TokenListTableProps {
  codes: CodeRecord[];
  versions: TestVersion[];
  adminKey: string;
  onRefresh: () => void;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '대기중', color: 'bg-yellow-500/20 text-yellow-400' },
  completed: { text: '완료', color: 'bg-green-500/20 text-green-400' },
  expired: { text: '만료', color: 'bg-red-500/20 text-red-400' },
};

function getPreferredTimezone(): string {
  try {
    return sessionStorage.getItem('admin_preferred_timezone') ?? 'Asia/Seoul';
  } catch {
    return 'Asia/Seoul';
  }
}

export function TokenListTable({ codes, versions, adminKey, onRefresh }: TokenListTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingExpiry, setEditingExpiry] = useState('');
  const [editingTimezone, setEditingTimezone] = useState('Asia/Seoul');
  const [actionError, setActionError] = useState('');

  const formatDate = (s: string) => new Date(s).toLocaleString('ko-KR');

  const getVersionLabel = (versionId: string | null | undefined) => {
    if (!versionId) return '-';
    const v = versions.find((v) => v.id === versionId);
    return v ? `v${v.version_number}` : '-';
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const handleDelete = async (id: string, studentName: string) => {
    if (!window.confirm(`${studentName} 학생의 코드를 삭제하시겠습니까?`)) return;
    setActionError('');
    try {
      const res = await fetch(`/api/admin/diagnosis/tokens/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '삭제 실패');
      }
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    }
  };

  const startEditing = (id: string, expiresAt: string) => {
    const tz = getPreferredTimezone();
    setEditingId(id);
    setEditingTimezone(tz);
    setEditingExpiry(utcToLocal(expiresAt, tz));
    setActionError('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingExpiry('');
  };

  const handleTimezoneChange = (newTz: string) => {
    // Re-express the same UTC moment in the new timezone
    if (editingId && editingExpiry) {
      try {
        const utcIso = localToUTC(editingExpiry, editingTimezone);
        setEditingExpiry(utcToLocal(utcIso, newTz));
      } catch {
        // keep current value if conversion fails
      }
    }
    setEditingTimezone(newTz);
    try { sessionStorage.setItem('admin_preferred_timezone', newTz); } catch { /* ignore */ }
  };

  const handleUpdateExpiry = async (id: string) => {
    if (!editingExpiry) return;
    setActionError('');
    try {
      const res = await fetch(`/api/admin/diagnosis/tokens/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ expiresAt: localToUTC(editingExpiry, editingTimezone) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '수정 실패');
      }
      setEditingId(null);
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.');
    }
  };

  return (
    <div>
      {actionError && <p className="mb-3 text-sm text-red-400">{actionError}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left py-3 px-4 font-semibold">학생명</th>
              <th className="text-left py-3 px-4 font-semibold">버전</th>
              <th className="text-left py-3 px-4 font-semibold">코드</th>
              <th className="text-left py-3 px-4 font-semibold">만료일시</th>
              <th className="text-left py-3 px-4 font-semibold">상태</th>
              <th className="text-left py-3 px-4 font-semibold">생성일</th>
              <th className="text-left py-3 px-4 font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => {
              const statusInfo = STATUS_LABELS[c.status];
              const isEditing = editingId === c.id;
              return (
                <tr key={c.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="py-3 px-4">{c.student_name}</td>
                  <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                    {getVersionLabel(c.test_version_id)}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => copyToClipboard(c.token)}
                      className="font-mono text-base tracking-widest hover:text-blue-400 transition-colors"
                      title="클릭하여 복사"
                    >
                      {c.token}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-wrap">
                        <input
                          type="datetime-local"
                          value={editingExpiry}
                          onChange={(e) => setEditingExpiry(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateExpiry(c.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          autoFocus
                          className="px-2 py-1 bg-gray-600 border border-blue-500 rounded text-white text-xs focus:outline-none"
                        />
                        <TimezoneSelect
                          value={editingTimezone}
                          onChange={handleTimezoneChange}
                          compact
                        />
                        <button
                          onClick={() => handleUpdateExpiry(c.id)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-semibold transition-colors"
                        >
                          저장
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(c.id, c.expires_at)}
                        className="hover:text-blue-400 transition-colors text-left"
                        title="클릭하여 만료일시 수정"
                      >
                        {formatDate(c.expires_at)}{' '}
                        <span className="text-gray-500 text-xs">{getTimezoneAbbr('Asia/Seoul')}</span>
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                      {statusInfo.text}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{formatDate(c.created_at)}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleDelete(c.id, c.student_name)}
                      disabled={c.status === 'completed'}
                      className="px-2 py-1 bg-red-700/50 hover:bg-red-600/70 rounded text-xs font-semibold text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={c.status === 'completed' ? '시험 완료 코드는 삭제 불가' : '코드 삭제'}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
