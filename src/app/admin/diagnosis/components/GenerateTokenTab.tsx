'use client';

import { useState, useEffect } from 'react';

interface GenerateTokenTabProps {
  adminKey: string;
}

interface CodeRecord {
  id: string;
  token: string;
  student_name: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  status: 'pending' | 'completed' | 'expired';
  test_version_id?: string | null;
}

interface TestVersion {
  id: string;
  version_number: number;
  is_current: boolean;
}

function generate6DigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getDefaultExpiresAt(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '대기중', color: 'bg-yellow-500/20 text-yellow-400' },
  completed: { text: '완료', color: 'bg-green-500/20 text-green-400' },
  expired: { text: '만료', color: 'bg-red-500/20 text-red-400' },
};

export function GenerateTokenTab({ adminKey }: GenerateTokenTabProps) {
  const [studentName, setStudentName] = useState('');
  const [code, setCode] = useState(generate6DigitCode());
  const [expiresAt, setExpiresAt] = useState(getDefaultExpiresAt());
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [codes, setCodes] = useState<CodeRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [versions, setVersions] = useState<TestVersion[]>([]);

  const fetchVersions = async () => {
    try {
      const res = await fetch('/api/admin/diagnosis/versions', {
        headers: { 'x-admin-key': adminKey },
      });
      if (res.ok) {
        const data = await res.json();
        const vList: TestVersion[] = data.versions ?? [];
        setVersions(vList);
        // Default to current version
        const current = vList.find((v) => v.is_current);
        if (current) setSelectedVersionId(current.id);
      }
    } catch {
      // silently fail
    }
  };

  const fetchCodes = async () => {
    setListLoading(true);
    try {
      const response = await fetch('/api/admin/diagnosis/tokens', {
        headers: { 'x-admin-key': adminKey },
      });
      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes || []);
      }
    } catch {
      // silently fail
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
    fetchCodes();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!studentName.trim()) {
      setError('학생명을 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/diagnosis/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          studentName: studentName.trim(),
          code: code.trim(),
          expiresAt: new Date(expiresAt).toISOString(),
          testVersionId: selectedVersionId || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '코드 생성 실패');
      }

      setStudentName('');
      setCode(generate6DigitCode());
      setExpiresAt(getDefaultExpiresAt());
      fetchCodes();
    } catch (err) {
      const message = err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getVersionLabel = (versionId: string | null | undefined) => {
    if (!versionId) return '-';
    const v = versions.find((v) => v.id === versionId);
    return v ? `v${v.version_number}` : '-';
  };

  return (
    <div className="space-y-10">
      {/* Code Generation Form */}
      <div>
        <h2 className="text-xl font-bold mb-6">새 코드 생성</h2>
        <form onSubmit={handleGenerate} className="space-y-5 max-w-2xl">
          <div>
            <label className="block text-sm font-semibold mb-2">학생명</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="예: 홍길동"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Version selector */}
          {versions.length > 0 && (
            <div>
              <label className="block text-sm font-semibold mb-2">진단테스트 버전</label>
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version_number}{v.is_current ? ' (현재 버전)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">6자리 접속 코드</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setCode(generate6DigitCode())}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm font-semibold transition-colors"
                >
                  새로 생성
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">만료 일시</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !studentName.trim() || code.length !== 6}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '생성 중...' : '코드 생성'}
          </button>
        </form>
      </div>

      {/* Code List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">발급된 코드 목록</h2>
          <button
            onClick={fetchCodes}
            disabled={listLoading}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {listLoading ? '로딩...' : '새로고침'}
          </button>
        </div>

        {codes.length === 0 && !listLoading && (
          <p className="text-gray-400">발급된 코드가 없습니다.</p>
        )}

        {codes.length > 0 && (
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
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const statusInfo = STATUS_LABELS[c.status];
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
                      <td className="py-3 px-4 text-gray-300">{formatDate(c.expires_at)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{formatDate(c.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
