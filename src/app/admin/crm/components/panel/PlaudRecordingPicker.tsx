'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, X, Search, Mic, CheckCircle2, ChevronLeft, User, RefreshCw } from 'lucide-react';
import type { ConsultationEntry } from '@/types/crm';
import { apiErrorMessage } from '@/lib/api-error';

interface PlaudAccount {
  key: string;
  label: string; // 직원 표시명(이민재/김우영)
}

interface Recording {
  id: string;
  name: string;
  created_at?: string;
  start_at?: string;
  duration?: number; // ms
  account_key?: string;
  owner_label?: string;
}

/** 제출한 전사 작업 — 모달을 닫아도 잃지 않도록 localStorage에 학생별로 둔다. */
interface AsrJob {
  task_id: string;
  recording_id: string;
  recording_name: string;
  recorded_at?: string;
  duration_sec?: number;
  account_key: string;
}

/** 전사 진행 확인 간격. DashScope 큐 지연 편차가 커서 상한은 넉넉히 둔다. */
const POLL_MS = 3000;
const MAX_WAIT_MS = 20 * 60 * 1000;
/** 녹음 목록 한 번에 받는 개수 — 넘으면 "더 보기"로 다음 페이지를 붙인다. */
const PAGE_SIZE = 20;

function jobKey(studentId: string): string {
  return `plaud-asr-job:${studentId}`;
}

function readJob(studentId: string): AsrJob | null {
  try {
    const raw = localStorage.getItem(jobKey(studentId));
    return raw ? (JSON.parse(raw) as AsrJob) : null;
  } catch {
    return null; // 프라이빗 모드·차단 등 — 저장이 안 될 뿐 기능은 돌아간다.
  }
}

function writeJob(studentId: string, job: AsrJob | null): void {
  try {
    if (job) localStorage.setItem(jobKey(studentId), JSON.stringify(job));
    else localStorage.removeItem(jobKey(studentId));
  } catch {
    /* 저장 실패는 무시 — 이 탭에서는 state로 계속 폴링한다. */
  }
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
  // 1단계: 직원(Plaud 계정) 선택
  const [accounts, setAccounts] = useState<PlaudAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState('');
  const [selected, setSelected] = useState<PlaudAccount | null>(null);

  // 2단계: 선택한 직원의 녹음 목록
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  // 목록은 PAGE_SIZE씩 받는다. 마지막으로 받은 페이지가 꽉 찼으면 다음 페이지가 있을 수 있다.
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // 가장 최근 요청만 반영한다 — 더 보기 응답이 새 검색·직원 전환 뒤에 도착해 엉뚱한 목록에 붙지 않게.
  const requestSeq = useRef(0);
  // 지금 목록을 만든 검색어 — 더 보기·새로고침은 입력칸이 아니라 이 값으로 요청한다(검색 안 누른 입력과 섞이지 않게).
  const [activeQuery, setActiveQuery] = useState<string | undefined>(undefined);
  const [listError, setListError] = useState('');
  const [q, setQ] = useState('');
  const [job, setJob] = useState<AsrJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitedSec, setWaitedSec] = useState(0);
  const [runError, setRunError] = useState('');
  const [doneName, setDoneName] = useState<string | null>(null);

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  // 마운트 시 사용 가능한 직원 계정을 불러온다. 1명뿐이면 선택 단계를 건너뛴다.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAccountsLoading(true);
      setAccountsError('');
      try {
        const res = await fetch('/api/crm/plaud/accounts', { headers: { 'x-admin-key': adminKey } });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setAccountsError(apiErrorMessage(json, '직원 계정을 불러오지 못했습니다.'));
          return;
        }
        const list: PlaudAccount[] = json.data ?? [];
        setAccounts(list);
        if (list.length === 0) setAccountsError('설정된 Plaud 계정이 없습니다.');
        else if (list.length === 1) setSelected(list[0]); // 단일 계정 → 바로 녹음 목록
      } catch {
        if (!cancelled) setAccountsError('네트워크 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminKey]);

  const load = useCallback(
    async (accountKey: string, query?: string, nextPage = 1) => {
      const more = nextPage > 1;
      const seq = ++requestSeq.current;
      if (more) setLoadingMore(true);
      else {
        setLoading(true);
        setLoadingMore(false); // 무효화된 더 보기 요청의 로딩 표시를 남기지 않는다
      }
      setListError('');
      try {
        const params = new URLSearchParams({
          account_key: accountKey,
          page: String(nextPage),
          page_size: String(PAGE_SIZE),
        });
        if (query) params.set('q', query);
        const res = await fetch(`/api/crm/plaud/recordings?${params.toString()}`, {
          headers: { 'x-admin-key': adminKey },
        });
        const json = await res.json();
        if (seq !== requestSeq.current) return;
        if (res.ok) {
          setActiveQuery(query);
          const list: Recording[] = json.data ?? [];
          // 페이지 사이에 새 녹음이 들어오면 앞 페이지 끝 항목이 다음 페이지에 다시 온다 — id로 거른다.
          setRecordings((prev) => {
            if (!more) return list;
            const seen = new Set(prev.map((r) => r.id));
            return [...prev, ...list.filter((r) => !seen.has(r.id))];
          });
          setPage(nextPage);
          setHasMore(list.length >= PAGE_SIZE);
        } else setListError(apiErrorMessage(json, '녹음 목록을 불러오지 못했습니다.'));
      } catch {
        setListError('네트워크 오류가 발생했습니다.');
      } finally {
        if (seq === requestSeq.current) {
          if (more) setLoadingMore(false);
          else setLoading(false);
        }
      }
    },
    [adminKey]
  );

  // 직원 선택이 바뀌면 그 직원의 녹음을 불러온다.
  useEffect(() => {
    if (selected) load(selected.key);
  }, [selected, load]);

  function backToAccounts() {
    requestSeq.current++; // 진행 중인 목록 요청 무효화
    setSelected(null);
    setRecordings([]);
    setPage(1);
    setHasMore(false);
    setLoading(false);
    setLoadingMore(false);
    setActiveQuery(undefined);
    setQ('');
    setListError('');
    setRunError('');
  }

  // 전사 작업을 제출만 한다. 완료까지 한 요청에서 기다리면 DashScope 큐 지연 편차를
  // 서버리스 실행 한도가 못 버티고, 재시도할 때마다 돌던 작업을 버리게 된다.
  async function pick(r: Recording) {
    if (!selected || job || submitting) return;
    setSubmitting(true);
    setRunError('');
    try {
      const res = await fetch(`/api/crm/students/${studentId}/plaud-memo/job`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ file_id: r.id, account_key: selected.key }),
      });
      const json = await res.json();
      if (res.ok && json.data?.task_id) {
        const next: AsrJob = {
          task_id: json.data.task_id,
          recording_id: r.id,
          recording_name: json.data.recording_name || r.name || '녹음',
          recorded_at: json.data.recorded_at,
          duration_sec: json.data.duration_sec,
          account_key: selected.key,
        };
        writeJob(studentId, next);
        setWaitedSec(0);
        setJob(next);
      } else {
        setRunError(apiErrorMessage(json, '전사 작업을 시작하지 못했습니다.'));
      }
    } catch {
      setRunError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // 모달을 다시 열면 돌고 있던 작업을 이어받는다 — 새로 제출하지 않는다.
  useEffect(() => {
    const saved = readJob(studentId);
    if (saved) setJob(saved);
  }, [studentId]);

  // 제출된 작업이 있으면 끝날 때까지 확인한다.
  useEffect(() => {
    if (!job) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    function finish(err: string) {
      writeJob(studentId, null);
      setJob(null);
      if (err) setRunError(err);
    }

    async function tick() {
      if (cancelled || !job) return;
      try {
        const res = await fetch(`/api/crm/students/${studentId}/plaud-memo/job`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            task_id: job.task_id,
            account_key: job.account_key,
            file_id: job.recording_id,
            recording_name: job.recording_name,
            recorded_at: job.recorded_at,
            duration_sec: job.duration_sec,
          }),
        });
        const json = await res.json();
        if (cancelled) return;

        if (res.ok && json.data?.status === 'done') {
          onCreated(json.data.entry); // 타임라인에 추가 + 상담 타임라인 섹션 자동 오픈
          const name = job.recording_name;
          finish('');
          setDoneName(name); // 완료 화면 표시(사용자가 등록 확인)
          return;
        }
        if (!res.ok) {
          finish(apiErrorMessage(json, '요약 생성에 실패했습니다.'));
          return;
        }
        if (Date.now() - startedAt > MAX_WAIT_MS) {
          finish('전사가 너무 오래 걸립니다. 잠시 후 다시 시도해주세요.');
          return;
        }
        setWaitedSec(Math.round((Date.now() - startedAt) / 1000));
        timer = setTimeout(tick, POLL_MS);
      } catch {
        // 일시적 네트워크 오류로 작업을 버리지 않는다 — 다음 주기에 다시 확인한다.
        if (!cancelled) timer = setTimeout(tick, POLL_MS);
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, studentId]);

  const busy = job !== null || submitting;
  const runningName = job?.recording_name ?? '';
  // 계정이 2개 이상일 때만 "직원 다시 선택"을 노출(1개면 선택 단계 자체가 없음).
  const canChangeAccount = accounts.length > 1;

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
            <p className="text-sm font-semibold text-gray-900">
              전사·요약 중입니다…{waitedSec > 0 && ` (${waitedSec}초)`}
            </p>
            <p className="text-xs text-gray-500 max-w-xs truncate">{runningName}</p>
            <p className="text-xs text-gray-400">
              녹음 길이와 대기열에 따라 <b>수십 초~수 분</b> 걸립니다.
              창을 닫아도 작업은 계속되고, 다시 열면 이어서 확인합니다.
            </p>
          </div>
        )}

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            {selected && canChangeAccount && (
              <button
                onClick={backToAccounts}
                disabled={busy}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-40"
                aria-label="직원 다시 선택"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <Mic size={16} className="text-blue-500 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 shrink-0">
              {selected ? `${selected.label} 녹음` : 'Plaud 직원 선택'}
            </h3>
            <span className="text-xs text-gray-400 truncate">→ {studentName} 상담메모</span>
          </div>
          <button onClick={onClose} disabled={busy} className="text-gray-400 hover:text-gray-600 disabled:opacity-40" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        {/* ── 1단계: 직원 선택 ────────────────────────────────── */}
        {!selected ? (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {accountsLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 size={18} className="animate-spin" /> 불러오는 중…
              </div>
            ) : accountsError ? (
              <div className="px-4 py-8 text-center text-sm text-red-500">{accountsError}</div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3">어느 직원의 Plaud 녹음을 가져올까요?</p>
                <div className="grid gap-2">
                  {accounts.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => setSelected(a)}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/60 transition-colors text-left"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500">
                        <User size={16} />
                      </span>
                      <span className="text-sm font-medium text-gray-900">{a.label}</span>
                      <span className="ml-auto text-xs text-gray-300">선택 →</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── 2단계: 선택한 직원의 녹음 목록 ─────────────────── */
          <>
            {/* search */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <Search size={14} className="text-gray-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && load(selected.key, q.trim() || undefined)}
                    placeholder="녹음 이름 검색 후 Enter"
                    className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => load(selected.key, q.trim() || undefined)}
                  disabled={loading || busy}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  검색
                </button>
                <button
                  onClick={() => load(selected.key, activeQuery)}
                  disabled={loading || busy}
                  aria-label="새로고침"
                  title="새로고침"
                  className="px-2.5 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                >
                  <RefreshCw size={14} />
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
                        {job?.recording_id === r.id ? (
                          <span className="flex items-center gap-1 text-xs text-blue-500 shrink-0">
                            <Loader2 size={13} className="animate-spin" /> 요약 중…
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 shrink-0">선택 →</span>
                        )}
                      </button>
                    </li>
                  ))}
                  {hasMore && (
                    <li className="pt-2 pb-1 text-center">
                      <button
                        onClick={() => load(selected.key, activeQuery, page + 1)}
                        disabled={loadingMore || busy}
                        className="px-4 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                      >
                        {loadingMore ? '불러오는 중…' : '더 보기'}
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* footer */}
            <div className="px-5 py-3 border-t border-gray-100">
              {runError && <p className="text-xs text-red-500 mb-2">{runError}</p>}
              <p className="text-[11px] text-gray-400">
                선택한 녹음을 전사·요약해 <b>미공개 초안</b>으로 상담메모에 추가합니다. 전사에 수십 초 걸릴 수 있습니다.
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                방금 녹음한 파일이 안 보이면 Plaud 앱에서 업로드가 끝났는지 확인한 뒤 새로고침하세요.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
