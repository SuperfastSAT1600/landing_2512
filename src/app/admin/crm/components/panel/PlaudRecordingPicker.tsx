'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, X, Search, Mic, CheckCircle2 } from 'lucide-react';
import type { ConsultationEntry } from '@/types/crm';

interface Recording {
  id: string;
  name: string;
  created_at?: string;
  start_at?: string;
  duration?: number; // ms
}

interface Props {
  studentId: string;
  studentName: string;
  adminKey: string;
  onClose: () => void;
  /** 초안 생성 성공 시 새 상담메모 entry 전달 → 타임라인 갱신용. */
  onCreated: (entry: ConsultationEntry) => void;
}

function fmtDuration(ms?: number): string {
  if (!ms) return '';
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

function fmtWhen(r: Recording): string {
  const iso = r.start_at || r.created_at;
  if (!iso) return '';
  // Plaud는 타임존 표기 없는 UTC 문자열을 주므로 UTC로 간주해 KST(+9h)로 변환한다.
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  const d = new Date(hasTz ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${p(kst.getUTCMonth() + 1)}-${p(kst.getUTCDate())} ${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}`;
}

export function PlaudRecordingPicker({ studentId, studentName, adminKey, onClose, onCreated }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [q, setQ] = useState('');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runError, setRunError] = useState('');
  const [doneName, setDoneName] = useState<string | null>(null);

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  const load = useCallback(
    async (query?: string) => {
      setLoading(true);
      setListError('');
      try {
        const url = query
          ? `/api/crm/plaud/recordings?q=${encodeURIComponent(query)}`
          : '/api/crm/plaud/recordings';
        const res = await fetch(url, { headers: { 'x-admin-key': adminKey } });
        const json = await res.json();
        if (res.ok) setRecordings(json.data ?? []);
        else setListError(json.error ?? '녹음 목록을 불러오지 못했습니다.');
      } catch {
        setListError('네트워크 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [adminKey]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function pick(r: Recording) {
    setRunningId(r.id);
    setRunError('');
    try {
      const res = await fetch(`/api/crm/students/${studentId}/plaud-memo`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ file_id: r.id }),
      });
      const json = await res.json();
      if (res.ok && json.data?.entry) {
        onCreated(json.data.entry); // 타임라인에 추가 + 상담 타임라인 섹션 자동 오픈
        setDoneName(r.name || '녹음'); // 완료 화면 표시(사용자가 등록 확인)
      } else if (res.status === 413) {
        setRunError('이 녹음은 24MB를 초과해 전사할 수 없습니다. (짧은 녹음으로 시도하세요)');
      } else {
        setRunError(json.error ?? '요약 생성에 실패했습니다.');
      }
    } catch {
      setRunError('네트워크 오류가 발생했습니다.');
    } finally {
      setRunningId(null);
    }
  }

  const busy = runningId !== null;
  const runningName = recordings.find((r) => r.id === runningId)?.name ?? '';

  // 완료 화면 — 상담 히스토리 등록을 사용자가 명확히 인지하도록.
  if (doneName) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl px-6 py-8 flex flex-col items-center text-center gap-3">
          <CheckCircle2 size={40} className="text-emerald-500" />
          <h3 className="text-base font-semibold text-gray-900">상담 히스토리에 등록되었습니다</h3>
          <p className="text-sm text-gray-500">
            <span className="text-gray-700">{studentName}</span> 학생의 상담 타임라인에
            <br />요약 초안(미공개)이 추가되었습니다.
          </p>
          <p className="text-xs text-gray-400 max-w-xs truncate">{doneName}</p>
          <button
            onClick={onClose}
            className="mt-2 px-5 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-sm font-semibold text-white transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-white shadow-xl">
        {/* 처리 중 오버레이 — 전사·요약은 수십 초 걸리므로 크게 표시한다. */}
        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/95 px-8 text-center">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <p className="text-sm font-semibold text-gray-900">전사·요약 중입니다…</p>
            <p className="text-xs text-gray-500 max-w-xs truncate">{runningName}</p>
            <p className="text-xs text-gray-400">
              녹음 길이에 따라 <b>수십 초~2분</b> 걸릴 수 있어요. 창을 닫지 말고 기다려 주세요.
            </p>
          </div>
        )}

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Mic size={16} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">Plaud 녹음 선택</h3>
            <span className="text-xs text-gray-400">→ {studentName} 상담메모</span>
          </div>
          <button onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-600 disabled:opacity-40" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        {/* search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={14} className="text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load(q.trim() || undefined)}
                placeholder="녹음 이름 검색 후 Enter"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>
            <button
              onClick={() => load(q.trim() || undefined)}
              disabled={loading || busy}
              className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              검색
            </button>
          </div>
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
              <Loader2 size={18} className="animate-spin" /> 불러오는 중…
            </div>
          ) : listError ? (
            <div className="px-4 py-8 text-center text-sm text-red-500">{listError}</div>
          ) : recordings.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">녹음이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recordings.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => pick(r)}
                    disabled={busy}
                    className="w-full text-left px-3 py-3 rounded-lg hover:bg-blue-50/60 disabled:opacity-50 transition-colors flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{r.name || '(제목 없음)'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtWhen(r)}
                        {r.duration ? ` · ${fmtDuration(r.duration)}` : ''}
                      </p>
                    </div>
                    {runningId === r.id ? (
                      <span className="flex items-center gap-1 text-xs text-blue-500 shrink-0">
                        <Loader2 size={13} className="animate-spin" /> 요약 중…
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 shrink-0">선택 →</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* footer */}
        <div className="px-5 py-3 border-t border-gray-100">
          {runError && <p className="text-xs text-red-500 mb-2">{runError}</p>}
          <p className="text-[11px] text-gray-400">
            선택한 녹음을 전사·요약해 <b>미공개 초안</b>으로 상담메모에 추가합니다. 전사에 수십 초 걸릴 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
