'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, Check, X } from 'lucide-react';

interface Concept {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
}

interface Props {
  adminKey: string;
}

export function ConceptManager({ adminKey }: Props) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<Record<string, string>>({});

  const fetchConcepts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/mathweb/concepts?limit=50', {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      setConcepts(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => { fetchConcepts(); }, [fetchConcepts]);

  const startEdit = (c: Concept) => {
    setEditingId(c.id);
    setEditValue(c.name);
    setError(prev => { const next = { ...prev }; delete next[c.id]; return next; });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/mathweb/concepts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ name: editValue.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(prev => ({ ...prev, [id]: json.error?.message ?? '저장 실패' }));
        return;
      }
      setEditingId(null);
      setConcepts(prev => prev.map(c => c.id === id ? { ...c, name: json.data.name, slug: json.data.slug } : c));
    } finally {
      setSavingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') saveEdit(id);
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 14, padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          개념 관리
        </div>
        <button
          onClick={fetchConcepts}
          style={{ padding: '5px 12px', background: '#141416', border: '1px solid #27272a', borderRadius: 6, color: '#a1a1aa', fontSize: 11, cursor: 'pointer' }}
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#52525b', padding: '32px 0', fontSize: 13 }}>로딩 중...</div>
      ) : concepts.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#52525b', padding: '32px 0', fontSize: 13 }}>등록된 개념이 없습니다</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {concepts.map((c) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#000', border: '1px solid #27272a', borderRadius: 8, padding: '9px 12px',
            }}>
              {editingId === c.id ? (
                <>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, c.id)}
                    style={{
                      flex: 1, padding: '3px 8px', background: '#09090b',
                      border: '1px solid #3f3f46', borderRadius: 5,
                      color: '#e4e4e7', fontSize: 13, outline: 'none',
                    }}
                  />
                  {error[c.id] && (
                    <span style={{ fontSize: 11, color: '#ef4444' }}>{error[c.id]}</span>
                  )}
                  <button
                    onClick={() => saveEdit(c.id)}
                    disabled={savingId === c.id}
                    style={{ padding: '4px 6px', background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', opacity: savingId === c.id ? 0.5 : 1 }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={cancelEdit}
                    style={{ padding: '4px 6px', background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 13, color: '#e4e4e7' }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: '#52525b' }}>사용 {c.usage_count}회</span>
                  <button
                    onClick={() => startEdit(c)}
                    style={{ padding: '4px 6px', background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}
                  >
                    <Pencil size={13} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
