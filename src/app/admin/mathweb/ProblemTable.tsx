'use client';

import { useState } from 'react';
import { ProblemEditModal } from './ProblemEditModal';

interface Concept { id: string; name: string; slug: string; }
interface Problem {
  id: string;
  title: string | null;
  question_image_url: string;
  memo: string | null;
  is_active: boolean;
  created_at: string;
  concepts: Concept[];
}

interface Props {
  problems: Problem[];
  adminKey: string;
  onRefresh: () => void;
}

export function ProblemTable({ problems, adminKey, onRefresh }: Props) {
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);

  const toggle = async (p: Problem) => {
    await fetch(`/api/admin/mathweb/problems/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    onRefresh();
  };

  const del = async (p: Problem) => {
    if (!confirm(`문제를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/mathweb/problems/${p.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey },
    });
    onRefresh();
  };

  if (problems.length === 0) {
    return <div style={{ textAlign: 'center', color: '#52525b', padding: '48px 0', fontSize: 14 }}>등록된 문제가 없습니다</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {problems.map((p) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: '#141416', border: '1px solid #27272a', borderRadius: 10, padding: '12px 16px',
          }}>
            <img
              src={p.question_image_url}
              alt="문제"
              style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#27272a' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#e4e4e7', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.title ?? p.id.slice(0, 8)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {p.concepts.map((c) => (
                  <span key={c.id} style={{
                    padding: '1px 6px', background: 'rgba(7,27,233,0.12)',
                    border: '1px solid rgba(7,27,233,0.3)', borderRadius: 3,
                    color: '#818cf8', fontSize: 11,
                  }}>{c.name}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <span style={{
                fontSize: 11, padding: '2px 6px', borderRadius: 4,
                background: p.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: p.is_active ? '#22c55e' : '#ef4444',
                border: `1px solid ${p.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>{p.is_active ? 'active' : 'inactive'}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setEditingProblem(p)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #3f3f46', borderRadius: 5, color: '#a1a1aa', fontSize: 11, cursor: 'pointer' }}>
                  수정
                </button>
                <button onClick={() => toggle(p)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #27272a', borderRadius: 5, color: '#a1a1aa', fontSize: 11, cursor: 'pointer' }}>
                  {p.is_active ? '비활성' : '활성'}
                </button>
                <button onClick={() => del(p)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingProblem && (
        <ProblemEditModal
          problem={editingProblem}
          adminKey={adminKey}
          onSave={onRefresh}
          onClose={() => setEditingProblem(null)}
        />
      )}
    </>
  );
}
