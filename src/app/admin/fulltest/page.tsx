'use client';

import { useEffect, useState, useCallback } from 'react';

interface FulltestSubmission {
  id: string;
  instagram_id: string | null;
  studentName: string;
  submittedAt: string;
  totalAnswered: number;
  totalUnits: number;
  correct: number;
  score: number;
}

interface PracticeSubmission {
  id: string;
  instagram_id: string;
  studentName: string | null;
  submittedAt: string;
  totalAnswered: number;
  correct: number;
  score: number;
}

type SubmissionRow = {
  id: string;
  instagram_id: string | null;
  studentName: string | null;
  submittedAt: string;
  totalAnswered: number;
  totalPossible: number | null;
  correct: number;
  score: number;
};

interface TestDef {
  id: string;
  label: string;
  description: string;
  apiType: 'fulltest' | 'practice';
  publicUrl?: string;
}

const TESTS: TestDef[] = [
  {
    id: 'fulltest',
    label: 'Full-Length Test #1',
    description: '2026 June SuperfastSAT',
    apiType: 'fulltest',
    publicUrl: '/test',
  },
  {
    id: 'june-2026-subskill-300',
    label: '6월 대비 연습 300문제',
    description: 'sub-skill 선별 RW',
    apiType: 'practice',
    publicUrl: '/practice/june-2026',
  },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TestContentsPage() {
  const [selectedTestId, setSelectedTestId] = useState<string>(TESTS[0].id);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('admin_key') ?? '' : '';

  function copyLink(test: TestDef) {
    if (!test.publicUrl) return;
    const url = `${window.location.origin}${test.publicUrl}`;
    navigator.clipboard.writeText(url);
    setCopiedId(test.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const fetchSubmissions = useCallback(async (testDef: TestDef) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: testDef.apiType });
      if (testDef.apiType === 'practice') {
        params.set('testId', testDef.id);
      }
      const res = await fetch(`/api/admin/fulltest?${params.toString()}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();

      if (testDef.apiType === 'fulltest') {
        const rows: SubmissionRow[] = (data.submissions ?? []).map((s: FulltestSubmission) => ({
          id: s.id,
          instagram_id: s.instagram_id,
          studentName: s.studentName,
          submittedAt: s.submittedAt,
          totalAnswered: s.totalAnswered,
          totalPossible: s.totalUnits,
          correct: s.correct,
          score: s.score,
        }));
        setSubmissions(rows);
        setSubmissionCounts((prev) => ({ ...prev, [testDef.id]: rows.length }));
      } else {
        const rows: SubmissionRow[] = (data.submissions ?? []).map((s: PracticeSubmission) => ({
          id: s.id,
          instagram_id: s.instagram_id,
          studentName: s.studentName,
          submittedAt: s.submittedAt,
          totalAnswered: s.totalAnswered,
          totalPossible: null,
          correct: s.correct,
          score: s.score,
        }));
        setSubmissions(rows);
        setSubmissionCounts((prev) => ({ ...prev, [testDef.id]: rows.length }));
      }
    } catch (err) {
      console.error('fetchSubmissions error:', err);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    const testDef = TESTS.find((t) => t.id === selectedTestId) ?? TESTS[0];
    fetchSubmissions(testDef);
  }, [selectedTestId, fetchSubmissions]);

  const selectedTest = TESTS.find((t) => t.id === selectedTestId) ?? TESTS[0];

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#e4e4e7' }}>
      {/* Header */}
      <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid #27272a' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>Test Contents</h1>
        <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>테스트별 제출 현황 및 성적</p>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 97px)' }}>
        {/* Left panel: test list */}
        <div style={{
          width: 280,
          flexShrink: 0,
          borderRight: '1px solid #27272a',
          padding: '16px 12px',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: 10, color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 4 }}>
            테스트 목록
          </div>
          {TESTS.map((test) => {
            const isActive = selectedTestId === test.id;
            const count = submissionCounts[test.id] ?? '—';
            return (
              <button
                key={test.id}
                onClick={() => setSelectedTestId(test.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: isActive ? '1px solid rgba(96,133,255,0.4)' : '1px solid transparent',
                  background: isActive ? 'rgba(7,27,233,0.1)' : 'transparent',
                  cursor: 'pointer',
                  marginBottom: 4,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#fff' : '#a1a1aa' }}>
                  {test.label}
                </div>
                <div style={{ fontSize: 11, color: isActive ? '#6085FF' : '#52525b', marginTop: 3 }}>
                  {test.description}
                </div>
                <div style={{ fontSize: 11, color: '#52525b', marginTop: 4 }}>
                  {typeof count === 'number' ? `${count}명 제출` : '로딩 중...'}
                </div>
                {test.publicUrl && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                    <a
                      href={test.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        padding: '5px 0',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 5,
                        color: '#a1a1aa',
                        fontSize: 11,
                        textAlign: 'center' as const,
                        textDecoration: 'none',
                        display: 'block',
                      }}
                    >
                      열기
                    </a>
                    <button
                      onClick={() => copyLink(test)}
                      style={{
                        flex: 1,
                        padding: '5px 0',
                        background: copiedId === test.id ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                        border: copiedId === test.id ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 5,
                        color: copiedId === test.id ? '#22c55e' : '#a1a1aa',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {copiedId === test.id ? '복사됨!' : '링크 복사'}
                    </button>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right panel: submissions table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{selectedTest.label}</div>
              <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>
                {selectedTest.description} &middot; {loading ? '로딩 중...' : `${submissions.length}명 제출`}
              </div>
            </div>
            <button
              onClick={() => fetchSubmissions(selectedTest)}
              style={{
                padding: '7px 14px',
                background: '#141416',
                border: '1px solid #27272a',
                borderRadius: 6,
                color: '#a1a1aa',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              새로고침
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#52525b', paddingTop: 60, fontSize: 14 }}>
              로딩 중...
            </div>
          ) : submissions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#52525b',
              paddingTop: 60,
              fontSize: 14,
              border: '1px dashed #27272a',
              borderRadius: 10,
              padding: '60px 24px',
            }}>
              아직 제출된 결과가 없습니다
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #27272a' }}>
                    {['Instagram ID', '이름', '날짜', '풀린 문제', '정답 수', '정답률'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          color: '#52525b',
                          fontWeight: 600,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((row) => (
                    <tr
                      key={row.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td style={{ padding: '12px 12px', fontWeight: 500 }}>
                        {row.instagram_id ? (() => {
                          const handle = row.instagram_id.startsWith('@') ? row.instagram_id.slice(1) : row.instagram_id;
                          return (
                            <a
                              href={`https://instagram.com/${handle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#6085FF', textDecoration: 'none' }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              @{handle}
                            </a>
                          );
                        })() : (
                          <span style={{ color: '#52525b' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 12px', color: '#a1a1aa' }}>
                        {row.studentName ?? <span style={{ color: '#52525b' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 12px', color: '#71717a', whiteSpace: 'nowrap' }}>
                        {formatDate(row.submittedAt)}
                      </td>
                      <td style={{ padding: '12px 12px', color: '#e4e4e7', fontWeight: 500 }}>
                        {row.totalPossible != null
                          ? `${row.totalAnswered}/${row.totalPossible}`
                          : row.totalAnswered}
                      </td>
                      <td style={{ padding: '12px 12px', color: '#e4e4e7', fontWeight: 600 }}>
                        {row.correct}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <ScoreBadge score={row.score} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 700,
      color,
      background: `${color}15`,
      border: `1px solid ${color}30`,
    }}>
      {score}%
    </span>
  );
}
