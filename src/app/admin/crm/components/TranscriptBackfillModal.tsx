'use client';

import { useRef, useState } from 'react';
import { X, FileAudio, AlertTriangle } from 'lucide-react';

interface Report {
  candidates: number;
  inserted: number;
  failed: number;
  remaining: number;
  unmatched: number;
  ambiguous: number;
}

interface TranscriptBackfillModalProps {
  adminKey: string;
  onClose: () => void;
}

const EMPTY: Report = {
  candidates: 0, inserted: 0, failed: 0, remaining: 0, unmatched: 0, ambiguous: 0,
};

/**
 * 메모는 있는데 전사가 없는 상담 건을 일괄 전사한다.
 *
 * 한 요청은 서버리스 한도(300s) 안에서 처리 가능한 만큼만 하고 남은 건수를 돌려주므로,
 * remaining이 0이 될 때까지 반복 호출한다. 전사 1건이 최대 240s라 전체를 한 요청에
 * 담을 수 없다. 중단해도 안전하다 — 이미 저장된 건은 다음 실행에서 자동 제외된다.
 */
export function TranscriptBackfillModal({ adminKey, onClose }: TranscriptBackfillModalProps) {
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState<number | null>(null);
  const [acc, setAcc] = useState<Report>(EMPTY);
  // 취소는 다음 배치 시작 전에만 걸린다 — 진행 중인 전사를 끊으면 이미 쓴 ASR 비용이 버려진다.
  const stopRef = useRef(false);

  async function run() {
    setRunning(true);
    setStopping(false);
    setDone(false);
    setError('');
    setAcc(EMPTY);
    stopRef.current = false;

    // 첫 응답의 candidates를 대상 건수로 고정한다. candidates는 "남은 후보 수"라
    // 배치마다 줄어들어, 그대로 쓰면 진행할수록 대상이 작아지는 화면이 된다.
    // (state는 이 루프의 클로저에 반영되지 않으므로 지역 변수로 잡는다.)
    let target: number | null = null;

    try {
      for (;;) {
        const res = await fetch('/api/crm/plaud/backfill-transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
          body: JSON.stringify({}),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? '전사 일괄 처리에 실패했습니다.');
          break;
        }

        const r = json.data as Report;
        if (target === null) {
          target = r.candidates;
          setTotal(r.candidates);
        }
        setAcc((prev) => ({
          candidates: r.candidates,
          inserted: prev.inserted + r.inserted,
          failed: prev.failed + r.failed,
          remaining: r.remaining,
          unmatched: r.unmatched,
          ambiguous: r.ambiguous,
        }));

        if (r.remaining === 0) {
          setDone(true);
          break;
        }
        // 여기 도달했다는 건 remaining > 0이라는 뜻이다. 그런데 이번 배치에서 하나도
        // 저장하지 못했다면 다음 배치도 같을 것이므로 영원히 돈다. 전부 실패한 경우든
        // 목록 조회만으로 시간 예산이 소진된 경우든 똑같이 멈추고 사람이 보게 한다.
        if (r.inserted === 0) {
          setError('처리가 진행되지 않아 중단했습니다. 서버 로그를 확인해주세요.');
          break;
        }
        if (stopRef.current) {
          setStopping(true);
          break;
        }
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setRunning(false);
    }
  }

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
          <button onClick={onClose} disabled={running} className="text-gray-400 hover:text-gray-600 disabled:opacity-40">
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

        {(running || done || acc.inserted > 0 || error) && (
          <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
            <div className="flex justify-between"><span>대상</span><span>{total ?? acc.candidates}건</span></div>
            <div className="flex justify-between"><span>저장 완료</span><span className="font-semibold text-gray-900">{acc.inserted}건</span></div>
            <div className="flex justify-between"><span>남음</span><span>{acc.remaining}건</span></div>
            {acc.failed > 0 && <div className="flex justify-between text-red-600"><span>실패</span><span>{acc.failed}건</span></div>}
            {(acc.unmatched > 0 || acc.ambiguous > 0) && (
              <div className="flex justify-between text-gray-500">
                <span>녹음 못 찾음</span><span>{acc.unmatched + acc.ambiguous}건</span>
              </div>
            )}
          </div>
        )}

        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
        {done && !error && <p className="mb-3 text-xs text-green-700">완료되었습니다.</p>}
        {stopping && <p className="mb-3 text-xs text-gray-600">중단했습니다. 다시 실행하면 남은 건부터 이어갑니다.</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={running}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          >
            닫기
          </button>
          {running ? (
            <button
              onClick={() => {
                stopRef.current = true;
              }}
              className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
            >
              진행 중… 중단
            </button>
          ) : (
            <button
              onClick={run}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              {done || acc.inserted > 0 ? '다시 실행' : '전사 시작'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
