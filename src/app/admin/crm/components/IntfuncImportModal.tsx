'use client';

import { useState } from 'react';
import { X, UploadCloud, AlertTriangle, XCircle } from 'lucide-react';

interface Stats {
  students: number;
  rows: number;
  converted: number;
  lost: number;
  excludedNoLabel: number;
  excludedNoTranscript: number;
  excludedAllFiltered: number;
  excludedAllTruncated: number;
  cutoffUnavailable: number;
  redactions: number;
  callsTotal: number;
  duplicateCalls: number;
  callsFiltered: number;
  callsTruncated: number;
  callsKept: number;
  callsByKind: {
    new_sales: number;
    renewal: number;
    winback: number;
    ops: number;
    unknown: number;
  };
}

/** 전송이 왜 실패했는지. 라우트가 code까지 붙여 돌려준다 (REQ-208). */
interface SendFailure {
  message: string;
  code?: string;
  /** 보내기 전에 거절된 행의 위치. */
  rows?: number[];
}

interface ImportSummary {
  importIds: string[];
  received: number;
  imported: number;
  skipped: number;
  errors: Array<{ index: number; code: string | null }>;
}

/** 통계 한 줄. 제외 사유가 세 갈래라 반복이 길어져 뽑았다. */
function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={`flex justify-between ${tone ?? 'text-gray-500'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

interface IntfuncImportModalProps {
  adminKey: string;
  onClose: () => void;
}

/**
 * 세일즈 콜 코퍼스를 IF internal dataset으로 보낸다.
 *
 * 잡이 없으므로 폴링도 없다 — 요청 하나가 전송의 전부이고, 학습은 콘솔에서 이 데이터셋을
 * 대상으로 돈다. 대신 행이 누적되므로 `importIds`를 보여준다: 되돌리려면 그 id가 필요하다.
 */
export function IntfuncImportModal({ adminKey, onClose }: IntfuncImportModalProps) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<SendFailure | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const headers = { 'Content-Type': 'application/json', 'x-admin-key': adminKey };

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/crm/intfunc/import', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return { ok: res.ok, json: await res.json() };
  }

  /** 대상·라벨 분포만 확인한다. 아무것도 보내지 않는다. */
  async function preview() {
    setBusy(true);
    setFailure(null);
    try {
      const { ok, json } = await post({ dry_run: true });
      if (!ok) setFailure({ message: json.error ?? '미리보기에 실패했습니다.', code: json.code });
      else setStats(json.data.stats);
    } catch {
      setFailure({ message: '네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도하세요.' });
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setFailure(null);
    try {
      const { ok, json } = await post({});
      if (!ok) {
        // 실패했으면 아무것도 들어가지 않았다 — summary를 세우지 않으므로 버튼은 열려 있다.
        setFailure({
          message: json.error ?? '전송에 실패했습니다.',
          code: json.code,
          rows: json.rows,
        });
        return;
      }
      setStats(json.data.stats);
      setSummary(json.data);
    } catch {
      setFailure({ message: '네트워크 오류가 발생했습니다. 연결을 확인하고 다시 시도하세요.' });
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
              <UploadCloud size={16} /> IF 데이터셋 전송
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              결과가 확정된 학생의 상담 전사를 IF 데이터셋으로 보냅니다.
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
            상담 전사가 <b>외부(IntelligentFunctions)로 전송</b>되어 그쪽 데이터셋에{' '}
            <b>보관됩니다</b>. 이름·연락처는 전송 전에 가려지지만, 파기 영수증은 없습니다 —
            되돌리려면 전송 후 나오는 import id가 필요합니다.
            <br />
            전환 예측 pack 학습은 전송 뒤 <b>IF 콘솔</b>에서 이 데이터셋으로 진행합니다.
            <br />
            먼저 <b>미리보기</b>로 대상 건수를 확인하세요.
          </div>
        </div>

        {stats && (
          <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
            <div className="flex justify-between">
              <span>대상 학생(결과 확정)</span>
              <span>{stats.students}명</span>
            </div>
            <div className="flex justify-between">
              <span>전송 행</span>
              <span className="font-semibold text-gray-900">{stats.rows}행</span>
            </div>
            <Row label="결제 / 이탈" value={`${stats.converted} / ${stats.lost}`} />

            <div className="!mt-2 border-t border-gray-200 pt-2 text-[11px] text-gray-400">
              제외된 학생
            </div>
            <Row label="전사 없음" value={`${stats.excludedNoTranscript}명`} />
            <Row label="세일즈 콜 아님" value={`${stats.excludedAllFiltered}명`} />
            <Row label="결과 확정 이후" value={`${stats.excludedAllTruncated}명`} />

            <div className="!mt-2 border-t border-gray-200 pt-2 text-[11px] text-gray-400">
              통화
            </div>
            <Row
              label="학습 통화 / 전체"
              value={`${stats.callsKept} / ${stats.callsTotal}건`}
              tone="text-gray-700"
            />
            <Row
              label="재결제 / 이탈 / 운영"
              value={`${stats.callsByKind.renewal} / ${stats.callsByKind.winback} / ${stats.callsByKind.ops}건`}
            />
            <Row label="결과 확정 이후 절단" value={`${stats.callsTruncated}건`} />
            <Row label="중복 제거" value={`${stats.duplicateCalls}건`} />
            <Row label="비식별 치환" value={`${stats.redactions}건`} />
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
            결과 확정 시점을 알 수 없는 학생이 있습니다. 그 학생은 결제·이탈 이후 통화까지
            데이터셋에 들어가, pack이 세일즈 신호 대신 결과 발화를 배울 수 있습니다.
          </p>
        )}

        {summary && (
          <div className="mb-3 space-y-1 rounded-lg border border-gray-200 p-3 text-xs">
            <Row label="보낸 행" value={`${summary.received}행`} tone="text-gray-700" />
            <div className="flex justify-between">
              <span className="text-gray-500">저장</span>
              <span className="font-semibold text-gray-900">{summary.imported}행</span>
            </div>
            <Row label="건너뜀(중복·무효)" value={`${summary.skipped}행`} />
            {summary.errors.length > 0 && (
              <>
                <div className="flex justify-between text-red-600">
                  <span>실패</span>
                  <span>{summary.errors.length}행</span>
                </div>
                <div className="text-[10px] text-red-500">
                  {[...new Set(summary.errors.map((e) => e.code ?? 'unknown'))].join(', ')}
                </div>
              </>
            )}
            <div className="!mt-2 border-t border-gray-200 pt-2">
              <div className="text-[11px] text-gray-400">import id — 되돌릴 때 필요합니다</div>
              {summary.importIds.map((id) => (
                <div key={id} className="truncate font-mono text-[10px] text-gray-700">
                  {id}
                </div>
              ))}
            </div>
          </div>
        )}

        {failure && (
          <div className="mb-3 flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-800">
            <XCircle size={14} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold">전송 실패</div>
              <p className="mt-0.5">{failure.message}</p>
              {failure.rows && failure.rows.length > 0 && (
                <p className="mt-1 text-[11px] text-red-700">
                  거절된 행 — {failure.rows.join(', ')}
                </p>
              )}
              {failure.code && (
                <p className="mt-1 truncate font-mono text-[10px] text-red-500">{failure.code}</p>
              )}
            </div>
          </div>
        )}
        {summary && (
          <p className="mb-3 text-xs text-green-700">
            전송이 끝났습니다. 학습은 IF 콘솔에서 이 데이터셋으로 진행하세요.
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
            disabled={busy || !!summary}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            미리보기
          </button>
          <button
            onClick={send}
            disabled={busy || !!summary}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
          >
            {busy ? '처리 중…' : 'IF로 전송'}
          </button>
        </div>
      </div>
    </div>
  );
}
