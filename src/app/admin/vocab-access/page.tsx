'use client';

import { useEffect, useState, useCallback } from 'react';

interface CodeRow {
  id: string;
  instagram_id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  first_used_at: string | null;
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
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState<{ instagram_id: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instagramId.trim()) return;
    setCreating(true);
    setNewCode(null);
    try {
      const res = await fetch('/api/admin/vocab-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ instagram_id: instagramId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? '생성 실패');
        return;
      }
      setNewCode(data);
      setInstagramId('');
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
    if (!confirm(`@${row.instagram_id}의 코드를 삭제하시겠습니까?`)) return;
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

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#e4e4e7' }}>
      <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid #27272a' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0 }}>단어 검색 접근 코드</h1>
        <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>인스타 댓글 이벤트 참여자에게 개인 코드 발급</p>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 900 }}>
        {/* 코드 생성 폼 */}
        <div style={{ background: '#141416', border: '1px solid #27272a', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', marginBottom: 14 }}>새 코드 발급</div>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10 }}>
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
            <button
              type="submit"
              disabled={!instagramId.trim() || creating}
              style={{
                padding: '9px 20px',
                background: '#6085FF',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: !instagramId.trim() || creating ? 0.5 : 1,
              }}
            >
              {creating ? '생성 중...' : '코드 발급'}
            </button>
          </form>

          {newCode && (
            <div style={{
              marginTop: 14,
              padding: '14px 16px',
              background: 'rgba(96,133,255,0.08)',
              border: '1px solid rgba(96,133,255,0.3)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ fontSize: 12, color: '#6085FF' }}>@{newCode.instagram_id}</span>
                <span style={{ fontSize: 13, color: '#71717a', margin: '0 8px' }}>→</span>
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
                  {['Instagram ID', '코드', '상태', '발급일', '첫 사용일', ''].map((h) => (
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
                      <a
                        href={`https://instagram.com/${row.instagram_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#6085FF', textDecoration: 'none', fontWeight: 500 }}
                      >
                        @{row.instagram_id}
                      </a>
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
