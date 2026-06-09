'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { RetryStrategy } from '@/types/crm';
import { StrategyAgentChat } from './StrategyAgentChat';

interface Props {
  adminKey: string;
}

type StrategyType = 'initial_contact' | 'initial_sales' | 'retry';

const TYPE_LABELS: Record<StrategyType, string> = {
  initial_contact: '최초 컨텍 전략',
  initial_sales: '최초 세일즈 전략',
  retry: '재시도 세일즈 전략',
};

function StrategySection({
  type,
  strategies,
  adminKey,
  onCreated,
  onDeleted,
}: {
  type: StrategyType;
  strategies: RetryStrategy[];
  adminKey: string;
  onCreated: (s: RetryStrategy) => void;
  onDeleted: (id: string) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) return;
    setAdding(true);
    const res = await fetch('/api/crm/retry-strategies', {
      method: 'POST',
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        type,
        description: newDesc.trim() || undefined,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      onCreated(json.data);
      setNewName('');
      setNewDesc('');
      setCreating(false);
    } else {
      alert('전략 생성에 실패했습니다.');
    }
    setAdding(false);
  }

  async function handleDelete(id: string, name: string) {
    const warn =
      type === 'retry'
        ? `"${name}" 전략을 삭제하면 포함된 학생들은 리드풀로 돌아갑니다. 계속할까요?`
        : `"${name}" 전략을 삭제할까요? 학생들의 전략 정보가 초기화됩니다.`;
    if (!confirm(warn)) return;
    const res = await fetch(`/api/crm/retry-strategies/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': adminKey },
    });
    if (res.ok) {
      onDeleted(id);
    } else {
      alert('삭제에 실패했습니다.');
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">{TYPE_LABELS[type]}</h3>
        <button
          onClick={() => setCreating((v) => !v)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus size={13} />새 전략
        </button>
      </div>

      {creating && (
        <div className="flex flex-col gap-2 mb-3">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setCreating(false);
            }}
            placeholder="전략 이름 입력..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <textarea
            rows={3}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="전략 내용 입력 (선택)..."
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={adding || !newName.trim()}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              추가
            </button>
            <button
              onClick={() => setCreating(false)}
              className="text-xs text-gray-400 hover:text-gray-600 px-2"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {strategies.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">등록된 전략이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {strategies.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
            >
              <span className="text-sm text-gray-700 font-medium">{s.name}</span>
              <button
                onClick={() => handleDelete(s.id, s.name)}
                className="text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StrategiesTab({ adminKey }: Props) {
  const [strategies, setStrategies] = useState<RetryStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/retry-strategies', {
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();
      setStrategies(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const initialContactStrategies = strategies.filter((s) => s.type === 'initial_contact');
  const initialSalesStrategies = strategies.filter((s) => s.type === 'initial_sales');
  const retryStrategies = strategies.filter((s) => s.type === 'retry');

  function handleCreated(s: RetryStrategy) {
    setStrategies((prev) => [...prev, s]);
  }

  function handleDeleted(id: string) {
    setStrategies((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">불러오는 중...</div>;
  }

  return (
    <div className="max-w-3xl space-y-5">
      <StrategyAgentChat adminKey={adminKey} />

      <div className="space-y-4">
        <p className="text-xs text-gray-400">
          전략을 만들고 학생 패널의 인입 정보에서 배정할 수 있습니다.
        </p>
        <StrategySection
          type="initial_contact"
          strategies={initialContactStrategies}
          adminKey={adminKey}
          onCreated={handleCreated}
          onDeleted={handleDeleted}
        />
        <StrategySection
          type="initial_sales"
          strategies={initialSalesStrategies}
          adminKey={adminKey}
          onCreated={handleCreated}
          onDeleted={handleDeleted}
        />
        <StrategySection
          type="retry"
          strategies={retryStrategies}
          adminKey={adminKey}
          onCreated={handleCreated}
          onDeleted={handleDeleted}
        />
      </div>
    </div>
  );
}
