/**
 * Plaud 메모 ↔ Plaud 녹음 재연결 (전사 백필용 순수 로직).
 *
 * Plaud 녹음에는 학생 참조가 없다. 녹음과 학생을 잇는 유일한 고리는
 * `plaud-memo` 라우트가 써 넣은 메모 첫 줄 헤더뿐이다:
 *   `🎙️ Plaud 상담 자동 요약 · {recording_name} · {YYYY-MM-DD HH:mm}` (KST)
 * 따라서 백필은 Plaud 파일 목록이 아니라 기존 메모에서 출발한다.
 * 메모가 된 적 없는 녹음은 학생도 라벨도 없어 복구 대상이 아니다.
 *
 * 이 파일은 I/O를 하지 않는다. 목록 조회·전사·삽입은 백필 스크립트가 담당한다.
 */
import type { PlaudRecording } from '@/lib/plaud-client';
import type { ConsultationEntry } from '@/types/crm';

/** 메모 헤더 마커. 라우트의 헤더 작성과 여기 파싱이 어긋나지 않도록 단일 소스로 둔다. */
export const PLAUD_MEMO_MARKER = '🎙️ Plaud 상담 자동 요약';

/** 헤더 조각 구분자. */
const SEP = ' · ';

/** `YYYY-MM-DD HH:mm` — 헤더 마지막 조각이 시각인지 판별한다. */
const KST_STAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/**
 * Plaud의 타임스탬프(start_at 등)를 한국시간(KST) "YYYY-MM-DD HH:mm"로 변환한다.
 * Plaud는 타임존 표기 없는 UTC 문자열(예: "2026-07-31T07:39:18")을 주므로 UTC로 간주해 +9h 한다.
 * 파싱 불가하면 원본을 그대로 반환한다.
 *
 * 헤더를 쓰는 쪽(plaud-memo 라우트)과 헤더를 맞추는 쪽(matchRecording)이 같은 함수를
 * 써야 포맷이 갈라지지 않으므로 여기 한 벌만 둔다.
 */
export function toKstDisplay(iso: string): string {
  if (!iso) return '';
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  const d = new Date(hasTz ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${p(kst.getUTCMonth() + 1)}-${p(kst.getUTCDate())} ${p(kst.getUTCHours())}:${p(kst.getUTCMinutes())}`;
}

export interface PlaudMemoHeader {
  recordingName: string;
  recordedAtKst: string;
}

/**
 * 메모 첫 줄에서 `{ recordingName, recordedAtKst }`를 뽑는다. Plaud 메모가 아니면 null.
 *
 * 정규식 한 방이 아니라 구분자로 쪼갠 뒤 되붙이는 이유: 녹음 이름 자체에 " · "가
 * 들어갈 수 있다. 마지막 조각이 시각 형식일 때만 시각으로 떼어내고 나머지는 이름으로 되붙인다.
 * 라우트가 `[name, time].filter(Boolean).join(' · ')`로 쓰므로 이름만·시각만·둘 다 없음이
 * 모두 실제로 발생한다.
 */
export function parsePlaudMemoHeader(rawMemo: string): PlaudMemoHeader | null {
  const firstLine = (rawMemo ?? '').split('\n')[0]?.trim() ?? '';
  if (!firstLine) return null;

  const segments = firstLine.split(SEP);
  if (segments[0] !== PLAUD_MEMO_MARKER) return null;

  const rest = segments.slice(1);
  const last = rest[rest.length - 1];
  if (last !== undefined && KST_STAMP.test(last)) {
    return { recordingName: rest.slice(0, -1).join(SEP), recordedAtKst: last };
  }
  return { recordingName: rest.join(SEP), recordedAtKst: '' };
}

export interface BackfillCandidate {
  entryId: string;
  header: PlaudMemoHeader;
}

/**
 * 타임라인에서 아직 전사가 저장되지 않은 Plaud 메모만 골라낸다.
 * @param capturedEntryIds 이미 `call_transcripts`에 행이 있는 ConsultationEntry.id 집합
 */
export function selectBackfillCandidates(
  timeline: ConsultationEntry[] | null | undefined,
  capturedEntryIds: Set<string>
): BackfillCandidate[] {
  const out: BackfillCandidate[] = [];
  for (const entry of timeline ?? []) {
    if (capturedEntryIds.has(entry.id)) continue;
    const header = parsePlaudMemoHeader(entry.raw_memo);
    if (!header) continue;
    out.push({ entryId: entry.id, header });
  }
  return out;
}

export type MatchResult =
  | { status: 'matched'; recording: PlaudRecording }
  | { status: 'ambiguous'; candidates: PlaudRecording[] }
  | { status: 'unmatched'; reason: 'no_identifiers' | 'not_found' };

/**
 * 헤더를 녹음 목록(여러 계정 병합 가능)에 맞춘다.
 *
 * 헤더에 실제로 있는 식별자만 조건으로 쓴다 — 이름·시각이 모두 있으면 둘 다 일치해야 하고,
 * 이름만 있으면 그 이름이 유일할 때만 매칭된다. 후보가 둘 이상이면 추측하지 않고 ambiguous로
 * 넘긴다. 잘못 붙인 전사는 학생에게 남의 상담 내용을 붙이는 것이고, 학습 라벨도 오염시킨다.
 */
export function matchRecording(
  header: PlaudMemoHeader,
  recordings: PlaudRecording[]
): MatchResult {
  const { recordingName, recordedAtKst } = header;
  if (!recordingName && !recordedAtKst) {
    return { status: 'unmatched', reason: 'no_identifiers' };
  }

  const candidates = recordings.filter(
    (r) =>
      (!recordingName || r.name === recordingName) &&
      (!recordedAtKst || toKstDisplay(r.start_at ?? '') === recordedAtKst)
  );

  if (candidates.length === 0) return { status: 'unmatched', reason: 'not_found' };
  if (candidates.length === 1) return { status: 'matched', recording: candidates[0] };
  return { status: 'ambiguous', candidates };
}
