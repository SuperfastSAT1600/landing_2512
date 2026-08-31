'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Brain, AlertTriangle } from 'lucide-react';

interface Stats {
  students: number;
  rows: number;
  converted: number;
  lost: number;
  excludedNoLabel: number;
  excludedNoCalls: number;
  cutoffUnavailable: number;
  redactions: number;
}

interface JobSummary {
  jobId: string;
  state: string;
  finished: boolean;
  packDigest: string | null;
  inputRows: number | null;
  failureCode: string | null;
  deletionFailed: boolean;
  verifiedEmpty: boolean | null;
}

interface IntfuncTrainingModalProps {
  adminKey: string;
  onClose: () => void;
}

const POLL_MS = 5000;

const STATE_LABEL: Record<string, string> = {
  awaiting_upload: '업로드 대기',
  validating: '검증 중',
  queued: '대기열',
  training: '학습 중',
  publishing: '게시 중',
  deleting_input: '업로드 파기 중',
  completed: '완료',
  failed: '실패',
  rejected: '거부됨',
  cancelled: '취소됨',
  expired: '만료됨',
  deletion_failed: '업로드 파기 실패',
};

/**
 * 세일즈 콜 코퍼스로 IF 전환 예측 pack을 학습시킨다.
 *
 * 잡은 intfunc 쪽에서 비동기로 돌기 때문에 시작 요청은 jobId만 받고 즉시 끝난다.
 * 이후 상태는 폴링으로 따라간다 — 전사 백필과 달리 탭을 닫아도 학습은 계속된다.
 */
export function IntfuncTrainingModal({ adminKey, onClose }: IntfuncTrainingModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [job, setJob] = useState<JobSummary | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/crm/intfunc/training', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return { ok: res.ok, json: await res.json() };
  }

  /** 대상·라벨 분포만 확인한다. 업로드도 학습도 하지 않는다. */
  async function preview() {
    setBusy(true);
    setError('');
    setJob(null);
    try {
      const { ok, json } = await post({ dry_run: true });
      if (!ok) setError(json.error ?? '미리보기에 실패했습니다.');
      else setStats(json.data.stats);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function startPolling(jobId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/crm/intfunc/training/${jobId}`, { headers });
        const json = await res.json();
        if (!res.ok) return;
        setJob(json.data);
        if (json.data.finished && pollRef.current) clearInterval(pollRef.current);
      } catch {
        // 폴링 실패는 무시한다 — 잡은 서버에서 계속 돈다.
      }
    }, POLL_MS);
  }

  async function start() {
    setBusy(true);
    setError('');
    try {
      const { ok, json } = await post({});
      if (!ok) {
        setError(json.error ?? '학습 시작에 실패했습니다.');
        return;
      }
      setStats(json.data.stats);
      setJob(json.data);
      if (!json.data.finished) startPolling(json.data.jobId);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function retryDeletion() {
    if (!job) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/crm/intfunc/training/${job.jobId}`, {
        method: 'POST',
        headers,
      });
      const json = await res.json();
      if (res.ok) setJob(json.data);
      else setError(json.error ?? '파기 재시도에 실패했습니다.');
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Brain size={16} /> 전환 예측 pack 학습
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              결과가 확정된 학생의 상담 전사로 IF pack을 학습시킵니다.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            상담 전사가 <b>외부(IntelligentFunctions)로 전송</b>됩니다. 이름·연락처는 전송 전에
            가려지고, 학습이 끝나면 업로드본은 파기되며 그 증거(파기 확인)가 남습니다.
            <br />
            먼저 <b>미리보기</b>로 대상 건수를 확인하세요. 학습에는 비용이 발생합니다.
          </div>
        </div>

        {stats && (
          <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
            <div className="flex justify-between">
              <span>대상 학생(결과 확정)</span>
              <span>{stats.students}명</span>
            </div>
            <div className="flex justify-between">
              <span>학습 행</span>
              <span className="font-semibold text-gray-900">{stats.rows}행</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>결제 / 이탈</span>
              <span>
                {stats.converted} / {stats.lost}
              </span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>비식별 치환</span>
              <span>{stats.redactions}건</span>
            </div>
            {stats.cutoffUnavailable > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>결과 시점 불명</span>
                <span>{stats.cutoffUnavailable}명</span>
              </div>
            )}
          </div>
        )}

        {stats && stats.cutoffUnavailable > 0 && (
          <p className="mb-3 text-xs text-amber-700">
            결과 확정 시점을 알 수 없는 학생이 있습니다. 그 학생은 결제·이탈 이후 통화까지 학습에
            들어가, pack이 세일즈 신호 대신 결과 발화를 배울 수 있습니다.
          </p>
        )}

        {job && (
          <div className="mb-3 space-y-1 rounded-lg border border-gray-200 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">상태</span>
              <span className="font-semibold text-gray-900">
                {STATE_LABEL[job.state] ?? job.state}
              </span>
            </div>
            {job.packDigest && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500">pack</span>
                <span className="truncate font-mono text-[10px] text-gray-700">
                  {job.packDigest}
                </span>
              </div>
            )}
            {job.verifiedEmpty !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">업로드 파기 확인</span>
                <span className={job.verifiedEmpty ? 'text-green-700' : 'text-red-600'}>
                  {job.verifiedEmpty ? '확인됨' : '미확인'}
                </span>
              </div>
            )}
            {job.failureCode && (
              <div className="flex justify-between text-red-600">
                <span>사유</span>
                <span>{job.failureCode}</span>
              </div>
            )}
          </div>
        )}

        {job?.deletionFailed && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-800">
            pack은 만들어졌지만 업로드를 파기하지 못했습니다. 끝난 잡이 아닙니다.
            <button
              onClick={retryDeletion}
              disabled={busy}
              className="mt-2 block rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-40"
            >
              파기 재시도
            </button>
          </div>
        )}

        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
        {job?.state === 'completed' && (
          <p className="mb-3 text-xs text-green-700">학습이 완료되었습니다.</p>
        )}
        {job && !job.finished && (
          <p className="mb-3 text-xs text-gray-600">
            학습은 서버에서 계속됩니다. 이 창을 닫아도 중단되지 않습니다.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            닫기
          </button>
          <button
            onClick={preview}
            disabled={busy || !!job}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            미리보기
          </button>
          <button
            onClick={start}
            disabled={busy || !!job}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
          >
            {busy ? '처리 중…' : '학습 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}
