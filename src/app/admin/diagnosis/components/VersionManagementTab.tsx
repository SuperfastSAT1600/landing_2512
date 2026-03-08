'use client';

import { useState, useEffect } from 'react';

interface TestVersion {
  id: string;
  version_number: number;
  title: string;
  time_limit_minutes: number;
  is_current: boolean;
  created_at: string;
  created_from: string | null;
  questionCount?: number;
}

interface VersionManagementTabProps {
  adminKey: string;
}

export function VersionManagementTab({ adminKey }: VersionManagementTabProps) {
  const [versions, setVersions] = useState<TestVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingCurrent, setSettingCurrent] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchVersions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/diagnosis/versions', {
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) throw new Error('버전 목록을 불러올 수 없습니다.');
      const data = await res.json();
      setVersions(data.versions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const handleSetCurrent = async (versionId: string) => {
    setSettingCurrent(versionId);
    try {
      const res = await fetch(`/api/admin/diagnosis/versions/${versionId}/set-current`, {
        method: 'PATCH',
        headers: { 'x-admin-key': adminKey },
      });
      if (!res.ok) throw new Error('설정 실패');
      await fetchVersions();
    } catch {
      setError('현재 버전 설정에 실패했습니다.');
    } finally {
      setSettingCurrent(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">진단테스트 버전 관리</h2>
          <p className="text-gray-400 text-sm mt-1">
            문항을 수정하면 새 버전이 생성됩니다. 현재 버전으로 지정된 버전이 새 코드에 배정됩니다.
          </p>
        </div>
        <button
          onClick={fetchVersions}
          disabled={loading}
          className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? '로딩...' : '새로고침'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && versions.length === 0 && (
        <p className="text-gray-400">버전이 없습니다. (자동 생성됩니다)</p>
      )}

      <div className="space-y-3">
        {versions.map((v) => (
          <div
            key={v.id}
            className={`rounded-xl border p-5 flex items-center justify-between gap-4 ${
              v.is_current
                ? 'border-blue-500/40 bg-blue-900/10'
                : 'border-gray-700 bg-gray-800/50'
            }`}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex-shrink-0">
                <span
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${
                    v.is_current ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  v{v.version_number}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white">{v.title}</span>
                  {v.is_current && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                      현재 버전
                    </span>
                  )}
                  {v.created_from && (
                    <span className="text-xs text-gray-500">
                      (이전 버전에서 파생)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                  <span>{v.questionCount ?? '?'}문항</span>
                  <span>·</span>
                  <span>{v.time_limit_minutes}분</span>
                  <span>·</span>
                  <span>{new Date(v.created_at).toLocaleString('ko-KR')}</span>
                </div>
              </div>
            </div>

            {!v.is_current && (
              <button
                onClick={() => handleSetCurrent(v.id)}
                disabled={settingCurrent === v.id}
                className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {settingCurrent === v.id ? '설정 중...' : '현재 버전으로 설정'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
