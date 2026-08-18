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

type RightView = 'submissions' | 'codes';

interface CodeRow {
  id: string;
  code: string;
  test_id: string;
  label: string;
  max_uses: number;
  is_active: boolean;
  created_at: string;
  usedCount: number;
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
  {
    id: 'quadratic-equations-30',
    label: '이차방정식 핵심 30문제',
    description: '근의 공식 · 짝수계수 · 판별식 · 근과 계수의 관계',
    apiType: 'practice',
    publicUrl: '/practice/quadratic',
  },
  {
    id: 'august-math-decimal-30',
    label: '8월 SAT MATH 실전연습1',
    description: '소수·분수 정답 30문항',
    apiType: 'practice',
    publicUrl: '/practice/august-math',
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
  const [rightView, setRightView] = useState<RightView>('submissions');
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [newCodeForm, setNewCodeForm] = useState({ code: '', label: '', maxUses: 50 });
  const [creatingCode, setCreatingCode] = useState(false);

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

  const fetchCodes = useCallback(async (testId: string) => {
    setCodesLoading(true);
    try {
      const res = await fetch(`/api/admin/test-codes?testId=${testId}`, {
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      setCodes(data.codes ?? []);
    } catch {
      setCodes([]);
    } finally {
      setCodesLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    const testDef = TESTS.find((t) => t.id === selectedTestId) ?? TESTS[0];
    fetchSubmissions(testDef);
    fetchCodes(selectedTestId);
    setRightView('submissions');
  }, [selectedTestId, fetchSubmissions, fetchCodes]);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{selectedTest.label}</div>
                <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>
                  {selectedTest.description} &middot; {loading ? '로딩 중...' : `${submissions.length}명 제출`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                {(['submissions', 'codes'] as RightView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setRightView(v)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 5,
                      border: rightView === v ? '1px solid rgba(96,133,255,0.4)' : '1px solid #27272a',
                      background: rightView === v ? 'rgba(7,27,233,0.15)' : 'transparent',
                      color: rightView === v ? '#6085FF' : '#71717a',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {v === 'submissions' ? '제출 현황' : '코드 관리'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                fetchSubmissions(selectedTest);
                fetchCodes(selectedTestId);
              }}
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

          {rightView === 'codes' && (
            <div>
              {/* Create code form */}
              <div style={{ background: '#141416', border: '1px solid #27272a', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', marginBottom: 12 }}>새 코드 만들기</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    placeholder="코드 (예: SAT2026)"
                    value={newCodeForm.code}
                    onChange={(e) => setNewCodeForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    style={{ flex: 2, minWidth: 120, padding: '8px 12px', background: '#09090b', border: '1px solid #27272a', borderRadius: 6, color: '#e4e4e7', fontSize: 13, letterSpacing: '0.05em' }}
                  />
                  <input
                    placeholder="라벨 (예: 6월 이벤트)"
                    value={newCodeForm.label}
                    onChange={(e) => setNewCodeForm(p => ({ ...p, label: e.target.value }))}
                    style={{ flex: 3, minWidth: 140, padding: '8px 12px', background: '#09090b', border: '1px solid #27272a', borderRadius: 6, color: '#e4e4e7', fontSize: 13 }}
                  />
                  <input
                    type="number"
                    placeholder="최대 인원"
                    value={newCodeForm.maxUses}
                    min={1}
                    onChange={(e) => setNewCodeForm(p => ({ ...p, maxUses: parseInt(e.target.value) || 50 }))}
                    style={{ width: 90, padding: '8px 12px', background: '#09090b', border: '1px solid #27272a', borderRadius: 6, color: '#e4e4e7', fontSize: 13 }}
                  />
                  <button
                    onClick={async () => {
                      if (!newCodeForm.code.trim()) return;
                      setCreatingCode(true);
                      try {
                        const res = await fetch('/api/admin/test-codes', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                          body: JSON.stringify({ code: newCodeForm.code, testId: selectedTestId, label: newCodeForm.label, maxUses: newCodeForm.maxUses }),
                        });
                        if (res.ok) {
                          setNewCodeForm({ code: '', label: '', maxUses: 50 });
                          fetchCodes(selectedTestId);
                        } else {
                          const err = await res.json();
                          alert(err.error ?? 'Failed to create code');
                        }
                      } finally {
                        setCreatingCode(false);
                      }
                    }}
                    disabled={!newCodeForm.code.trim() || creatingCode}
                    style={{ padding: '8px 16px', background: '#6085FF', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: !newCodeForm.code.trim() || creatingCode ? 0.5 : 1 }}
                  >
                    {creatingCode ? '생성 중...' : '생성'}
                  </button>
                </div>
              </div>

              {/* Codes list */}
              {codesLoading ? (
                <div style={{ textAlign: 'center', color: '#52525b', paddingTop: 40 }}>로딩 중...</div>
              ) : codes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#52525b', paddingTop: 40, fontSize: 14 }}>코드가 없습니다</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {codes.map((c) => (
                    <div key={c.id} style={{ background: '#141416', border: '1px solid #27272a', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: c.is_active ? '#e4e4e7' : '#52525b', letterSpacing: '0.08em' }}>{c.code}</span>
                          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: c.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: c.is_active ? '#22c55e' : '#ef4444', border: `1px solid ${c.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                            {c.is_active ? 'active' : 'inactive'}
                          </span>
                        </div>
                        {c.label && <div style={{ fontSize: 12, color: '#71717a', marginTop: 3 }}>{c.label}</div>}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: c.usedCount >= c.max_uses ? '#ef4444' : '#e4e4e7' }}>{c.usedCount}</div>
                        <div style={{ fontSize: 11, color: '#52525b' }}>/ {c.max_uses}명</div>
                      </div>
                      <button
                        onClick={async () => {
                          await fetch(`/api/admin/test-codes/${c.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                            body: JSON.stringify({ isActive: !c.is_active }),
                          });
                          fetchCodes(selectedTestId);
                        }}
                        style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #27272a', borderRadius: 6, color: '#a1a1aa', fontSize: 11, cursor: 'pointer' }}
                      >
                        {c.is_active ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`코드 "${c.code}"를 삭제하시겠습니까?\n등록된 ${c.usedCount}명의 기록도 함께 삭제됩니다.`)) return;
                          await fetch(`/api/admin/test-codes/${c.id}`, {
                            method: 'DELETE',
                            headers: { 'x-admin-key': adminKey },
                          });
                          fetchCodes(selectedTestId);
                        }}
                        style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {rightView === 'submissions' && (
            loading ? (
              <div style={{ textAlign: 'center', color: '#52525b', paddingTop: 60, fontSize: 14 }}>
                로딩 중...
              </div>
            ) : submissions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#52525b',
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
            )
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
