'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, BookOpen, Copy, Check } from 'lucide-react';
import type { CoachPrepRequestView } from '@/types/coach-prep';
import { studentCountsBySlug, type CoachStudentCount } from '@/lib/coach-roster-counts';
import type { CoachRoster } from '@/lib/coach-roster';
import { MAX_COACHES_PER_REQUEST, buildLinkMessage, defaultDeadlineInput, kstInputToIso } from '@/lib/coach-prep-request';

interface CoachOption { slug: string; name: string; subjects: string[] }

interface Props {
  studentId: string;
  studentName: string;
  adminKey: string;
  onClose: () => void;
  onCreated: () => void;
}

const linkFor = (studentId: string, token: string) => `${window.location.origin}/coach-prep/${studentId}?t=${token}`;

function countLabel(counts: Map<string, CoachStudentCount> | null, slug: string): string {
  if (!counts) return '학생 수 —';
  const c = counts.get(slug) ?? { active: 0, onboarding: 0 };
  return `재원 ${c.active} · 온보딩 ${c.onboarding}`;
}

// 코치를 고르고(최대 5명) 응답 마감을 정하면 코치별 개인 링크가 만들어진다
export function CoachRequestModal({ studentId, studentName, adminKey, onClose, onCreated }: Props) {
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 담당 학생 수는 참고용 — 불러오지 못해도 코치 선택은 막지 않는다 (null = 로딩 중이거나 실패)
  const [counts, setCounts] = useState<Map<string, CoachStudentCount> | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [deadline, setDeadline] = useState(() => defaultDeadlineInput());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CoachPrepRequestView[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/coaches', { headers: { 'x-admin-key': adminKey } })
      .then((r) => r.json())
      .then((j: { success: boolean; coaches?: { slug: string; name: string; isActive: boolean; subjects: string[] }[] }) => {
        if (!j.success || !j.coaches) throw new Error('load');
        setCoaches(j.coaches.filter((c) => c.isActive).map(({ slug, name, subjects }) => ({ slug, name, subjects })));
      })
      .catch(() => setLoadError('코치 목록을 불러오지 못했습니다.'));
  }, [adminKey]);

  useEffect(() => {
    fetch('/api/crm/coach-roster', { headers: { 'x-admin-key': adminKey } })
      .then((r) => r.json())
      .then((j: { data?: CoachRoster }) => setCounts(j.data ? studentCountsBySlug(j.data) : null))
      .catch(() => setCounts(null));
  }, [adminKey]);

  const shown = useMemo(() => coaches.filter((c) => c.name.includes(query.trim())), [coaches, query]);

  function toggle(slug: string) {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length >= MAX_COACHES_PER_REQUEST ? prev : [...prev, slug]));
  }

  async function submit() {
    const deadlineAt = kstInputToIso(deadline);
    if (!deadlineAt) { setError('응답 마감 일시를 입력해 주세요.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/students/${studentId}/coach-requests`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach_slugs: selected, deadline_at: deadlineAt }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? '링크를 만들지 못했습니다.'); return; }
      setCreated(json.data.requests as CoachPrepRequestView[]);
      onCreated();
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-violet-500" />
            <h2 className="text-sm font-semibold text-gray-900">코치 준비 · {studentName}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="닫기"><X size={15} className="text-gray-400" /></button>
        </div>

        {created ? (
          <div className="p-5 space-y-3 overflow-y-auto">
            <p className="text-xs text-gray-500">코치마다 개인 링크입니다. 각자에게 해당 링크를 보내 주세요. 응답은 슬랙과 CRM에서 확인할 수 있습니다.</p>
            <ul className="space-y-2">
              {created.map((r) => (
                <li key={r.id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                  <span className="text-sm font-medium text-gray-800 w-24 shrink-0 truncate">{r.coach_name}</span>
                  <span className="flex-1 min-w-0 truncate text-[11px] text-gray-400">{linkFor(studentId, r.token)}</span>
                  <button onClick={() => copy(r.id, linkFor(studentId, r.token))} className="shrink-0 flex items-center gap-1 text-xs font-semibold text-violet-700">
                    {copied === r.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}{copied === r.id ? '복사됨' : '복사'}
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => copy('all', buildLinkMessage(window.location.origin, studentId, created.map((r) => ({ coachName: r.coach_name, token: r.token })), created[0].deadline_at))}
              className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
            >
              {copied === 'all' ? '복사됨' : '안내문과 링크 전체 복사'}
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">코치 선택 ({selected.length}/{MAX_COACHES_PER_REQUEST})</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름 검색" className="w-32 rounded-md border border-gray-200 px-2 py-1 text-xs" />
              </div>
              {loadError ? <p className="text-xs text-red-600">{loadError}</p> : (
                <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {shown.map((c) => (
                    <label key={c.slug} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={selected.includes(c.slug)} onChange={() => toggle(c.slug)} disabled={!selected.includes(c.slug) && selected.length >= MAX_COACHES_PER_REQUEST} />
                      <span className="text-gray-800">{c.name}</span>
                      {c.subjects.length > 0 && <span className="text-[11px] text-gray-400">{c.subjects.join(' · ')}</span>}
                      <span className="ml-auto text-[11px] tabular-nums text-gray-500">{countLabel(counts, c.slug)}</span>
                    </label>
                  ))}
                  {shown.length === 0 && <p className="px-3 py-3 text-xs text-gray-400">{coaches.length === 0 ? '불러오는 중…' : '일치하는 코치가 없습니다.'}</p>}
                </div>
              )}
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-gray-600">응답 마감 (한국 시간, KST)</span>
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <span className="text-[11px] text-gray-400">기본은 지금부터 24시간 뒤입니다. 마감이 지나면 코치는 응답할 수 없습니다.</span>
            </label>

            {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button" onClick={() => copy('plain', `${window.location.origin}/coach-prep/${studentId}`)}
                className="text-xs text-gray-500 underline underline-offset-2"
              >
                {copied === 'plain' ? '복사됨' : '응답 없이 자료 링크만 복사'}
              </button>
              <button
                onClick={submit} disabled={selected.length === 0 || submitting}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {submitting ? '만드는 중…' : '링크 만들기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
