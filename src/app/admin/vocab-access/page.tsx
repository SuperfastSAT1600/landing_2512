'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface CodeRow {
  id: string;
  instagram_id: string | null;
  code: string;
  is_active: boolean;
  scope: 'vocab' | 'mathweb' | 'both';
  created_at: string;
  first_used_at: string | null;
  lead_id?: string | null;
  label?: string | null;
}

interface LeadResult {
  id: string;
  name: string;
  parent_phone: string | null;
  grade: string | null;
  inquiry_date: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VocabAccessPage() {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [instagramId, setInstagramId] = useState('');
  const [scope, setScope] = useState<'vocab' | 'mathweb' | 'both'>('vocab');
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState<{ instagram_id?: string | null; code: string; access_links?: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  // 리드 검색 모드
  const [mode, setMode] = useState<'direct' | 'lead'>('direct');
  const [leadSearch, setLeadSearch] = useState('');
  const [leadResults, setLeadResults] = useState<LeadResult[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadResult | null>(null);
  const [leadSearching, setLeadSearching] = useState(false);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const leadSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const adminKey = typeof window !== 'undefined' ? localStorage.getItem('admin_key') ?? '' : '';

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vocab-access', {
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      setCodes(data.codes ?? []);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleLeadSearchInput = (value: string) => {
    setLeadSearch(value);
    setSelectedLead(null);
    setInstagramId('');
    if (leadSearchTimeout.current) clearTimeout(leadSearchTimeout.current);
    if (!value.trim()) {
      setLeadResults([]);
      setShowLeadDropdown(false);
      return;
    }
    leadSearchTimeout.current = setTimeout(async () => {
      setLeadSearching(true);
      try {
        const res = await fetch(`/api/crm/students?name_search=${encodeURIComponent(value.trim())}`, {
          headers: { 'x-admin-key': adminKey },
        });
        const data = await res.json();
        setLeadResults(data.data ?? []);
        setShowLeadDropdown(true);
      } finally {
        setLeadSearching(false);
      }
    }, 300);
  };

  const selectLead = (lead: LeadResult) => {
    setSelectedLead(lead);
    setLeadSearch(lead.name);
    setLeadResults([]);
    setShowLeadDropdown(false);
    setInstagramId('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'lead' && !selectedLead) return;
    if (mode === 'direct' && !instagramId.trim()) return;
    setCreating(true);
    setNewCode(null);
    try {
      const payload = mode === 'lead'
        ? { lead_id: selectedLead!.id, scope }
        : { instagram_id: instagramId.trim(), scope };
      const res = await fetch('/api/admin/vocab-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? '생성 실패');
        return;
      }
      setNewCode(data);
      setInstagramId('');
      setSelectedLead(null);
      setLeadSearch('');
      fetchCodes();
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (row: CodeRow) => {
    await fetch(`/api/admin/vocab-access/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ is_active: !row.is_active }),
    });
    fetchCodes();
  };

  const handleDelete = async (row: CodeRow) => {
    const displayName = row.instagram_id ? `@${row.instagram_id}` : (row.label ?? '리드');
    if (!confirm(`${displayName}의 코드를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/vocab-access/${row.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey },
    });
    fetchCodes();
  };

  const copyCode = (row: CodeRow) => {
    navigator.clipboard.writeText(`${row.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SECRET_PAGES = [
    {
      name: 'Vocab Counter',
      path: '/vocabcounter',
      scope: 'vocab' as const,
      desc: '단어 검색 · 난이도 분류 · 어원 학습',
      color: '#6085FF',
    },
    {
      name: 'Math Web',
      path: '/mathweb',
      scope: 'mathweb' as const,
      desc: 'SAT Math 개념 그래프 · 플래시카드',
      color: '#818cf8',
    },
  ];

  const canSubmit = (mode === 'lead' ? !!selectedLead : !!instagramId.trim()) && !creating;

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#e4e4e7' }}>
      <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid #27272a' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>시크릿페이지</h1>
        <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>코드 기반 접근 제한 페이지 — 발급 코드 관리</p>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 900 }}>
        {/* 운영 중인 시크릿 페이지 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>운영 중인 페이지</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {SECRET_PAGES.map((page) => (
              <a
                key={page.path}
                href={page.path}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: '#141416',
                  border: '1px solid #27272a',
                  borderRadius: 10,
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${page.color}18`, border: `1px solid ${page.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>{page.scope === 'vocab' ? '📝' : '🕸️'}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7' }}>{page.name}</div>
                    <div style={{ fontSize: 11, color: '#52525b', marginTop: 2 }}>{page.desc}</div>
                    <div style={{ fontSize: 11, color: page.color, marginTop: 3, fontFamily: 'monospace' }}>{page.path}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 12, color: '#3f3f46', flexShrink: 0 }}>↗</div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* 코드 생성 폼 */}
        <div style={{ background: '#141416', border: '1px solid #27272a', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa' }}>새 코드 발급</div>
            {/* 모드 탭 */}
            <div style={{ display: 'flex', gap: 2, background: '#09090b', borderRadius: 7, padding: 3, border: '1px solid #27272a' }}>
              {(['direct', 'lead'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setInstagramId('');
                    setSelectedLead(null);
                    setLeadSearch('');
                    setLeadResults([]);
                    setNewCode(null);
                  }}
                  style={{
                    padding: '5px 13px',
                    borderRadius: 5,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: mode === m ? '#27272a' : 'transparent',
                    color: mode === m ? '#e4e4e7' : '#52525b',
                    transition: 'all 0.15s',
                  }}
                >
                  {m === 'direct' ? 'Instagram ID' : '리드 검색'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreate}>
            {mode === 'direct' ? (
              /* 직접 입력 모드 */
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  value={instagramId}
                  onChange={(e) => setInstagramId(e.target.value.replace(/^@/, ''))}
                  placeholder="인스타그램 ID (@ 제외)"
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    background: '#09090b',
                    border: '1px solid #27272a',
                    borderRadius: 8,
                    color: '#e4e4e7',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <ScopeSelect value={scope} onChange={setScope} />
                <IssueButton disabled={!canSubmit} creating={creating} />
              </div>
            ) : (
              /* 리드 검색 모드 */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 리드 검색 입력 */}
                <div style={{ position: 'relative' }}>
                  <input
                    value={leadSearch}
                    onChange={(e) => handleLeadSearchInput(e.target.value)}
                    onFocus={() => leadResults.length > 0 && setShowLeadDropdown(true)}
                    placeholder="학생 이름으로 검색..."
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      background: '#09090b',
                      border: `1px solid ${selectedLead ? 'rgba(96,133,255,0.5)' : '#27272a'}`,
                      borderRadius: 8,
                      color: '#e4e4e7',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {leadSearching && (
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#52525b' }}>
                      검색 중...
                    </div>
                  )}

                  {/* 드롭다운 결과 */}
                  {showLeadDropdown && leadResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      background: '#1c1c1f',
                      border: '1px solid #27272a',
                      borderRadius: 8,
                      zIndex: 50,
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}>
                      {leadResults.map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => selectLead(lead)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid #27272a',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, color: '#71717a', fontWeight: 600 }}>
                            {lead.name.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7' }}>{lead.name}</div>
                            <div style={{ fontSize: 11, color: '#52525b', marginTop: 1 }}>
                              {[lead.grade, lead.parent_phone, lead.inquiry_date ? formatDate(lead.inquiry_date) : null].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showLeadDropdown && !leadSearching && leadResults.length === 0 && leadSearch.trim() && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      background: '#1c1c1f',
                      border: '1px solid #27272a',
                      borderRadius: 8,
                      zIndex: 50,
                      padding: '12px 14px',
                      fontSize: 13,
                      color: '#52525b',
                    }}>
                      검색 결과 없음
                    </div>
                  )}
                </div>

                {/* 선택된 리드 정보 */}
                {selectedLead && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(96,133,255,0.06)',
                    border: '1px solid rgba(96,133,255,0.2)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(96,133,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, color: '#6085FF', fontWeight: 700 }}>
                      {selectedLead.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7' }}>{selectedLead.name}</div>
                      <div style={{ fontSize: 11, color: '#52525b', marginTop: 1 }}>
                        {[selectedLead.grade, selectedLead.parent_phone].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedLead(null); setLeadSearch(''); setInstagramId(''); }}
                      style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: 16, padding: '2px 4px' }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* scope + 발급 버튼 (리드 선택 후 표시, Instagram ID 불필요) */}
                {selectedLead && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <ScopeSelect value={scope} onChange={setScope} />
                    <IssueButton disabled={!canSubmit} creating={creating} />
                  </div>
                )}
              </div>
            )}
          </form>

          {newCode && (
            <div style={{
              marginTop: 14,
              padding: '14px 16px',
              background: 'rgba(96,133,255,0.08)',
              border: '1px solid rgba(96,133,255,0.3)',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              {/* 코드 행 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  {newCode.instagram_id && (
                    <>
                      <span style={{ fontSize: 12, color: '#6085FF' }}>@{newCode.instagram_id}</span>
                      <span style={{ fontSize: 13, color: '#71717a', margin: '0 8px' }}>→</span>
                    </>
                  )}
                  <span style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '0.15em' }}>
                    {newCode.code}
                  </span>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(newCode.code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={{ padding: '6px 14px', background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.07)', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 6, color: copied ? '#22c55e' : '#a1a1aa', fontSize: 12, cursor: 'pointer' }}
                >
                  {copied ? '복사됨!' : '코드 복사'}
                </button>
              </div>
              {/* 전용 링크 행 */}
              {newCode.access_links?.map((link) => (
                <div key={link} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#a1a1aa', wordBreak: 'break-all' }}>{link}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(link)}
                    style={{ flexShrink: 0, padding: '5px 12px', background: 'rgba(96,133,255,0.1)', border: '1px solid rgba(96,133,255,0.3)', borderRadius: 6, color: '#6085FF', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    링크 복사
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 발급 목록 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#71717a' }}>총 {codes.length}명 발급</div>
          <button
            onClick={fetchCodes}
            style={{ padding: '6px 14px', background: '#141416', border: '1px solid #27272a', borderRadius: 6, color: '#a1a1aa', fontSize: 12, cursor: 'pointer' }}
          >
            새로고침
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#52525b', paddingTop: 60 }}>로딩 중...</div>
        ) : codes.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#52525b', paddingTop: 60, fontSize: 14 }}>발급된 코드가 없습니다</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  {['Instagram ID', '코드', '상태', '스코프', '발급일', '첫 사용일', ''].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#52525b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 12px' }}>
                      {row.instagram_id ? (
                        <a
                          href={`https://instagram.com/${row.instagram_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#6085FF', textDecoration: 'none', fontWeight: 500 }}
                        >
                          @{row.instagram_id}
                        </a>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: '#e4e4e7', fontWeight: 500 }}>{row.label ?? '리드'}</span>
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(96,133,255,0.1)', border: '1px solid rgba(96,133,255,0.25)', color: '#6085FF' }}>리드</span>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <button
                        onClick={() => copyCode(row)}
                        style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#e4e4e7', letterSpacing: '0.12em', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="클릭하여 복사"
                      >
                        {row.code}
                      </button>
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 4,
                        background: row.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: row.is_active ? '#22c55e' : '#ef4444',
                        border: `1px solid ${row.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}>
                        {row.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 4,
                        background: row.scope === 'both' ? 'rgba(168,85,247,0.1)' : row.scope === 'mathweb' ? 'rgba(7,27,233,0.1)' : 'rgba(255,255,255,0.06)',
                        color: row.scope === 'both' ? '#c084fc' : row.scope === 'mathweb' ? '#818cf8' : '#71717a',
                        border: `1px solid ${row.scope === 'both' ? 'rgba(168,85,247,0.3)' : row.scope === 'mathweb' ? 'rgba(7,27,233,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {row.scope === 'both' ? 'BOTH' : row.scope === 'mathweb' ? 'MATH' : 'VOCAB'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px', color: '#71717a', whiteSpace: 'nowrap' }}>
                      {formatDate(row.created_at)}
                    </td>
                    <td style={{ padding: '12px 12px', color: row.first_used_at ? '#a1a1aa' : '#52525b', whiteSpace: 'nowrap' }}>
                      {row.first_used_at ? formatDate(row.first_used_at) : '미사용'}
                    </td>
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleToggle(row)}
                          style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #27272a', borderRadius: 5, color: '#a1a1aa', fontSize: 11, cursor: 'pointer' }}
                        >
                          {row.is_active ? '비활성화' : '활성화'}
                        </button>
                        {row.scope === 'vocab' && (
                          <button
                            onClick={async () => {
                              await fetch(`/api/admin/vocab-access/${row.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
                                body: JSON.stringify({ scope: 'both' }),
                              });
                              fetchCodes();
                            }}
                            style={{ padding: '5px 10px', background: 'transparent', border: '1px solid rgba(7,27,233,0.4)', borderRadius: 5, color: '#818cf8', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            + mathweb
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(row)}
                          style={{ padding: '5px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ScopeSelect({ value, onChange }: { value: string; onChange: (v: 'vocab' | 'mathweb' | 'both') => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'vocab' | 'mathweb' | 'both')}
      style={{
        padding: '9px 12px',
        background: '#09090b',
        border: '1px solid #27272a',
        borderRadius: 8,
        color: '#e4e4e7',
        fontSize: 13,
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      <option value="vocab">Vocab</option>
      <option value="mathweb">Math Web</option>
      <option value="both">Both</option>
    </select>
  );
}

function IssueButton({ disabled, creating }: { disabled: boolean; creating: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        padding: '9px 20px',
        background: '#6085FF',
        border: 'none',
        borderRadius: 8,
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {creating ? '생성 중...' : '코드 발급'}
    </button>
  );
}
