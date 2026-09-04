'use client';

import { X, FileAudio, AlertTriangle } from 'lucide-react';
import { useTranscriptBackfill } from './useTranscriptBackfill';

interface TranscriptBackfillModalProps {
  adminKey: string;
  onClose: () => void;
}

const MAX_SHOWN_FAILURES = 3;

function mmss(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * 메모는 있는데 전사가 없는 상담 건을 일괄 전사한다.
 *
 * 표시만 담당한다 — 배치 루프·타임아웃·오류 분류는 useTranscriptBackfill이 갖는다.
 * 첫 응답이 오기 전에는 숫자 표를 그리지 않는다. 0으로 채운 표는 "대상 없음"으로 읽힌다.
 */
export function TranscriptBackfillModal({ adminKey, onClose }: TranscriptBackfillModalProps) {
  const b = useTranscriptBackfill(adminKey);
  const active = b.phase === 'listing' || b.phase === 'running';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <FileAudio size={16} /> 전사 일괄 처리
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              메모는 있는데 전사가 없는 상담 건을 찾아 전사합니다.
            </p>
          </div>
          <button onClick={onClose} disabled={active} className="text-gray-400 hover:text-gray-600 disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        {/* 이 기능은 과거분 복구용 임시 도구다 — 상시 운영 기능이 아니다. */}
        <div className="mb-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <b>임시 기능입니다.</b> 지난 녹음의 전사를 되찾기 위한 1회성 복구 도구이며,
            정리가 끝나면 제거됩니다. 앞으로 만드는 메모는 자동으로 전사가 저장됩니다.
            <br />
            건당 AI 전사 비용이 발생하고, 최대 4분이 걸립니다.
            <b> 완료될 때까지 이 탭을 닫지 마세요.</b>
          </div>
        </div>

        {b.phase !== 'idle' && (
          <div className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
            <div className="flex justify-between text-gray-500">
              <span>
                {active ? `${b.batch + 1}번째 배치 진행 중` : `배치 ${b.batch}회`}
              </span>
              <span>경과 {mmss(b.elapsedMs)}</span>
            </div>

            {b.target === null ? (
              // 첫 응답 전 — 학생·녹음 목록을 훑는 중이라 아직 아무 숫자도 없다.
              <p className="text-gray-600">
                대상을 집계하는 중입니다. 첫 응답까지 최대 5분 걸릴 수 있습니다.
              </p>
            ) : (
              <>
                {b.progress !== null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.round(b.progress * 100)}%` }}
                    />
                  </div>
                )}
                <div className="flex justify-between"><span>대상</span><span>{b.target}건</span></div>
                <div className="flex justify-between">
                  <span>저장 완료</span>
                  <span className="font-semibold text-gray-900">{b.inserted}건</span>
                </div>
                <div className="flex justify-between"><span>남음</span><span>{b.remaining}건</span></div>
                {b.failed > 0 && (
                  <div className="flex justify-between text-red-600"><span>실패</span><span>{b.failed}건</span></div>
                )}
                {(b.unmatched > 0 || b.ambiguous > 0) && (
                  <div className="flex justify-between text-gray-500">
                    <span>녹음 못 찾음</span><span>{b.unmatched + b.ambiguous}건</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {b.error && (
          <div className="mb-3 space-y-1 text-xs text-red-600">
            <p>{b.error}</p>
            {b.failures.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-4 text-gray-600">
                {b.failures.slice(0, MAX_SHOWN_FAILURES).map((f) => (
                  <li key={f.entryId}>
                    {f.recordingName} — {f.error}
                  </li>
                ))}
                {b.failures.length > MAX_SHOWN_FAILURES && (
                  <li>외 {b.failures.length - MAX_SHOWN_FAILURES}건</li>
                )}
              </ul>
            )}
          </div>
        )}
        {b.phase === 'done' && <p className="mb-3 text-xs text-green-700">완료되었습니다.</p>}
        {b.phase === 'stopped' && (
          <p className="mb-3 text-xs text-gray-600">중단했습니다. 다시 실행하면 남은 건부터 이어갑니다.</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={active}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          >
            닫기
          </button>
          {active ? (
            <button
              onClick={b.stop}
              disabled={b.stopRequested}
              className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-60"
            >
              {b.stopRequested ? '이번 배치까지만 진행합니다…' : '진행 중… 중단'}
            </button>
          ) : (
            <button
              onClick={b.start}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              {b.batch > 0 ? '다시 실행' : '전사 시작'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
