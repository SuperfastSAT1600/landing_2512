'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TestResult {
  id: string;
  student_email: string;
  student_name: string;
  submitted_at: string;
  total_time_seconds: number;
  answeredCount: number;
  totalQuestions: number;
  correctCount: number;
  slack_sent_at: string | null;
  slack_error: string | null;
}

interface ViewResultsTabProps {
  adminKey: string;
}

export function ViewResultsTab({ adminKey }: ViewResultsTabProps) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<string | null>(null);

  const testSlack = async () => {
    setTestingSlack(true);
    setSlackTestResult(null);
    try {
      const res = await fetch('/api/admin/diagnosis/test-slack', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      setSlackTestResult(data.ok ? '✅ 전송 성공 — 채널 확인하세요' : `❌ 실패: ${data.error}`);
    } catch {
      setSlackTestResult('❌ 네트워크 오류');
    } finally {
      setTestingSlack(false);
    }
  };

  const resendSlack = async (resultId: string) => {
    setResendingId(resultId);
    try {
      const res = await fetch(`/api/admin/diagnosis/resend-slack/${resultId}`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      if (data.ok) {
        setResults((prev) =>
          prev.map((r) => r.id === resultId ? { ...r, slack_sent_at: new Date().toISOString(), slack_error: null } : r)
        );
      } else {
        alert(`재전송 실패: ${data.error}`);
      }
    } catch {
      alert('네트워크 오류');
    } finally {
      setResendingId(null);
    }
  };

  const copyReportLink = (resultId: string) => {
    const url = `${window.location.origin}/reports/${resultId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(resultId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await fetch(`/api/admin/diagnosis/results?${params}`, {
        headers: {
          'x-admin-key': adminKey,
        },
      });

      if (!response.ok) {
        throw new Error('결과를 불러올 수 없습니다.');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={testSlack}
          disabled={testingSlack}
          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {testingSlack ? '전송 중...' : 'Slack 연결 테스트'}
        </button>
        {slackTestResult && (
          <span className="text-sm text-gray-300">{slackTestResult}</span>
        )}
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="학생명 또는 이메일로 검색"
          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={fetchResults}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? '검색 중...' : '검색'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {results.length === 0 && !loading && !error && (
        <p className="text-gray-400">시험 결과가 없습니다.</p>
      )}

      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-3 px-4 font-semibold">학생명</th>
                <th className="text-left py-3 px-4 font-semibold">이메일</th>
                <th className="text-left py-3 px-4 font-semibold">응시 날짜</th>
                <th className="text-left py-3 px-4 font-semibold">소요 시간</th>
                <th className="text-left py-3 px-4 font-semibold">푼 문제 수</th>
                <th className="text-left py-3 px-4 font-semibold">맞춘 문제</th>
                <th className="text-left py-3 px-4 font-semibold">상세 보기</th>
                <th className="text-left py-3 px-4 font-semibold">보고서 링크</th>
                <th className="text-left py-3 px-4 font-semibold">인사이트 편집</th>
                <th className="text-left py-3 px-4 font-semibold">Slack</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="py-3 px-4">{result.student_name}</td>
                  <td className="py-3 px-4 break-all">{result.student_email}</td>
                  <td className="py-3 px-4">{formatDate(result.submitted_at)}</td>
                  <td className="py-3 px-4">{formatTime(result.total_time_seconds)}</td>
                  <td className="py-3 px-4">{result.answeredCount}/{result.totalQuestions}</td>
                  <td className="py-3 px-4">{result.correctCount}/{result.totalQuestions}</td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/diagnosis/${result.id}`}
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      보기
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => copyReportLink(result.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        copiedId === result.id
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {copiedId === result.id ? '✓ 복사됨' : '링크 복사'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/reports/${result.id}/insights`}
                      className="text-purple-400 hover:text-purple-300 underline text-xs"
                    >
                      편집
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    {result.slack_sent_at ? (
                      <span className="text-green-400 text-xs">✓ 전송됨</span>
                    ) : (
                      <button
                        onClick={() => resendSlack(result.id)}
                        disabled={resendingId === result.id}
                        title={result.slack_error ?? '미전송'}
                        className="px-2 py-1 bg-yellow-700 hover:bg-yellow-600 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {resendingId === result.id ? '전송 중...' : '재전송'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
