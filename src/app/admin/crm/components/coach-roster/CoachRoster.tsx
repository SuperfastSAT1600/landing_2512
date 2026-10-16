'use client';

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { RECENT_AHEAD_DAYS, RECENT_PAST_DAYS, type CoachRoster as Roster } from '@/lib/coach-roster';
import { CoachCard, StudentList } from './CoachCard';
import { CoachOrderEditor } from './CoachOrderEditor';

interface Props { adminKey: string; onSelectStudentById: (id: string) => void }

type Loaded = { roster: Roster | null };

async function fetchRoster(adminKey: string): Promise<Loaded> {
  try {
    const res = await fetch('/api/crm/coach-roster', { headers: { 'x-admin-key': adminKey } });
    const json = (await res.json().catch(() => null)) as { data?: Roster } | null;
    const ok = res.ok && Array.isArray(json?.data?.coaches) && Array.isArray(json?.data?.unassigned);
    return { roster: ok ? json!.data! : null };
  } catch {
    return { roster: null };
  }
}

async function saveOrder(adminKey: string, slugs: string[]): Promise<string | null> {
  try {
    const res = await fetch('/api/admin/coaches/order', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ slugs }),
    });
    if (res.ok) return null;
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    return json?.error?.message ?? '순서를 저장하지 못했습니다.';
  } catch {
    return '순서를 저장하지 못했습니다 — 네트워크 오류';
  }
}

function Summary({ roster }: { roster: Roster }) {
  // 코치 아래 + 미배정의 재원 학생(한 학생이 여러 코치에 있어도 한 번)
  const active = new Set([...roster.coaches.flatMap((c) => c.students), ...roster.unassigned]
    .filter((s) => s.status === 'active').map((s) => s.profileId));
  const teaching = roster.coaches.filter((c) => c.students.length > 0).length;
  return (
    <p data-testid="roster-summary" className="text-[13px] text-gray-500">
      재원 학생 {active.size}명 · 수업 중 코치 {teaching}명 · 미배정 {roster.unassigned.length}명
      <span className="ml-2 text-[11px] text-gray-400">(담당 = 최근 {RECENT_PAST_DAYS}일·앞으로 {RECENT_AHEAD_DAYS}일 수업을 연 코치, 그 기간 수업이 없으면 SRM 매칭 코치)</span>
    </p>
  );
}

// 리드 허브 '코치 현황' 탭 — 직접 정한 코치 순서대로 코치별 재원 학생 수와 명단
export function CoachRoster({ adminKey, onSelectStudentById }: Props) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [roster, setRoster] = useState<Roster | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRoster(adminKey).then(({ roster: r }) => {
      if (cancelled) return;
      setRoster(r);
      setState(r ? 'loaded' : 'error');
    });
    return () => { cancelled = true; };
  }, [adminKey, reloadKey]);

  const reload = () => { setState('loading'); setReloadKey((k) => k + 1); };

  async function handleSave(slugs: string[]) {
    setSaving(true);
    setSaveError(null);
    const err = await saveOrder(adminKey, slugs);
    setSaving(false);
    if (err) { setSaveError(err); return; }
    setEditing(false);
    reload();
  }

  if (state === 'loading' && !roster) {
    return <div className="flex items-center gap-2 py-10 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> 코치 현황을 불러오는 중…</div>;
  }
  if (state === 'error' || !roster) {
    return (
      <div className="py-10 text-sm text-gray-500">
        코치 현황을 불러오지 못했습니다.{' '}
        <button onClick={reload} className="text-blue-600 underline">다시 시도</button>
      </div>
    );
  }

  const registered = roster.coaches.filter((c) => c.registered && c.slug).map((c) => ({ slug: c.slug!, name: c.name }));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Summary roster={roster} />
        <div className="ml-auto flex gap-2">
          {!editing && (
            <button onClick={() => { setSaveError(null); setEditing(true); }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">순서 편집</button>
          )}
          <button onClick={reload} disabled={state === 'loading' || editing} className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={12} className={state === 'loading' ? 'animate-spin' : ''} /> 새로고침
          </button>
        </div>
      </div>

      {editing ? (
        <CoachOrderEditor initial={registered} saving={saving} error={saveError} onSave={handleSave} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roster.coaches.map((c) => <CoachCard key={c.key} coach={c} onOpen={onSelectStudentById} />)}
          </div>
          {roster.unassigned.length > 0 && (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3">
              <p className="mb-2 text-sm font-semibold text-amber-800">코치 미배정 {roster.unassigned.length}명 <span className="text-[11px] font-normal text-amber-700">— 재원·온보딩·휴원이지만 SRM에 진행 중인 코치 매칭이 없음</span></p>
              <StudentList students={roster.unassigned} onOpen={onSelectStudentById} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
