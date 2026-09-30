/**
 * Qwen(DashScope) 파일 전사 — 장시간 오디오용 비동기 ASR.
 *
 * 동기 ASR(qwen3-asr-flash)은 길이·용량 상한이 낮아 상담 통화(20분+)를 못 받는다.
 * 파일 전사 API는 오디오 URL을 알리바바가 직접 가져가므로 서버가 오디오를 내려받거나
 * 청킹할 필요가 없다(21분/20MB 실측 ~22초).
 *
 * 흐름: 제출(X-DashScope-Async) → 작업 폴링 → transcription_url 문서 조회 → 화자별 텍스트 병합
 */

const BASE_URL = process.env.QWEN_ASR_BASE_URL?.trim() || 'https://dashscope-intl.aliyuncs.com';
export const ASR_MODEL = process.env.QWEN_ASR_MODEL?.trim() || 'fun-asr';

/** 폴링 간격(ms)과 기본 최대 횟수 — 기본값은 상한 240s(대화형 메모 경로 기준). */
export const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 80;

/** 전사 실패(제출 거절·작업 FAILED·결과 없음). 라우트에서 502로 매핑. */
export class AsrFailedError extends Error {
  constructor(message = '녹음 전사에 실패했습니다.') {
    super(message);
    this.name = 'AsrFailedError';
  }
}

/** 폴링 상한 내에 끝나지 않음. AsrFailedError 하위 → 라우트가 동일하게 처리. */
export class AsrTimeoutError extends AsrFailedError {
  constructor() {
    super('전사가 시간 안에 끝나지 않았습니다. 잠시 후 다시 시도해주세요.');
    this.name = 'AsrTimeoutError';
  }
}

interface Sentence {
  text?: string;
  speaker_id?: number;
}

/**
 * 문장 배열을 화자별로 병합한다. 연속된 같은 화자는 한 줄로 합쳐 읽기 쉽게 만든다.
 * speaker_id가 없으면 빈 문자열을 반환해 호출부가 평문으로 폴백하게 한다.
 */
function joinBySpeaker(sentences: Sentence[]): string {
  const hasSpeaker = sentences.some((s) => typeof s.speaker_id === 'number');
  if (!hasSpeaker) return '';

  const lines: string[] = [];
  let current: { speaker: number; parts: string[] } | null = null;

  for (const s of sentences) {
    const text = s.text?.trim();
    if (!text) continue;
    const speaker = typeof s.speaker_id === 'number' ? s.speaker_id : -1;
    if (current && current.speaker === speaker) {
      current.parts.push(text);
    } else {
      if (current) lines.push(`화자${current.speaker + 1}: ${current.parts.join(' ')}`);
      current = { speaker, parts: [text] };
    }
  }
  if (current) lines.push(`화자${current.speaker + 1}: ${current.parts.join(' ')}`);

  return lines.join('\n');
}

/** 전사 작업을 제출하고 task_id를 받는다. */
async function submitTask(audioUrl: string, apiKey: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/services/audio/asr/transcription`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: ASR_MODEL,
      input: { file_urls: [audioUrl] },
      // 화자분리를 켜면 상담사/고객이 갈려 요약이 문맥 추론에 의존하지 않아도 된다.
      parameters: { language_hints: ['ko'], diarization_enabled: true, speaker_count: 2 },
    }),
  });
  if (!res.ok) {
    throw new AsrFailedError(`전사 요청이 거절됐습니다. (${res.status})`);
  }
  const json = (await res.json()) as { output?: { task_id?: string } };
  const taskId = json.output?.task_id;
  if (!taskId) throw new AsrFailedError('전사 작업 ID를 받지 못했습니다.');
  return taskId;
}

/** 작업이 끝날 때까지 폴링하고 결과 항목을 반환한다. */
async function pollTask(
  taskId: string,
  apiKey: string,
  sleep: (ms: number) => Promise<void>,
  maxPolls: number
): Promise<{ transcription_url?: string }> {
  for (let i = 0; i < maxPolls; i++) {
    await sleep(POLL_INTERVAL_MS);
    const res = await fetch(`${BASE_URL}/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = (await res.json()) as {
      output?: {
        task_status?: string;
        message?: string;
        results?: { transcription_url?: string }[];
      };
    };
    const status = json.output?.task_status;
    if (!status || status === 'PENDING' || status === 'RUNNING') continue;

    if (status !== 'SUCCEEDED') {
      throw new AsrFailedError(`전사에 실패했습니다. (${json.output?.message ?? status})`);
    }
    const result = json.output?.results?.[0];
    if (!result?.transcription_url) throw new AsrFailedError('전사 결과를 받지 못했습니다.');
    return result;
  }
  throw new AsrTimeoutError();
}

/** 작업 상태 1회 조회 결과. 진행 중이면 아무것도 저장할 게 없다. */
export type AsrTaskCheck = { status: 'running' } | { status: 'done'; text: string };

/** 완료된 작업의 transcription_url 문서를 읽어 화자 라벨이 붙은 전사문으로 만든다. */
async function readTranscript(transcriptionUrl: string): Promise<string> {
  const doc = (await (await fetch(transcriptionUrl)).json()) as {
    transcripts?: { text?: string; sentences?: Sentence[] }[];
  };
  const transcript = doc.transcripts?.[0];
  const text = joinBySpeaker(transcript?.sentences ?? []) || (transcript?.text ?? '').trim();
  if (!text) throw new AsrFailedError('전사 결과가 비어 있습니다.');
  return text;
}

/**
 * 전사 작업만 제출하고 즉시 task_id를 돌려준다.
 *
 * 대화형 경로(상담 메모)는 이 함수로 제출만 하고 대기는 클라이언트 폴링에 맡긴다 —
 * 한 요청 안에서 끝까지 기다리면 DashScope 큐 지연 편차를 서버리스 실행 한도가 못 버티고,
 * 재시도할 때마다 돌고 있는 작업을 버리고 새로 제출하게 된다.
 * @throws AsrFailedError 제출 거절
 */
export async function submitAsrTask(audioUrl: string): Promise<string> {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) throw new Error('QWEN_API_KEY is not set');
  return submitTask(audioUrl, apiKey);
}

/**
 * 제출한 작업을 **한 번만** 조회한다. sleep 하지 않는다 — 대기는 호출자(브라우저)가 한다.
 * @throws AsrFailedError 작업 실패·빈 결과
 */
export async function checkAsrTask(taskId: string): Promise<AsrTaskCheck> {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) throw new Error('QWEN_API_KEY is not set');

  const res = await fetch(`${BASE_URL}/api/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const json = (await res.json()) as {
    output?: {
      task_status?: string;
      message?: string;
      results?: { transcription_url?: string }[];
    };
  };
  const status = json.output?.task_status;
  if (!status || status === 'PENDING' || status === 'RUNNING') return { status: 'running' };

  if (status !== 'SUCCEEDED') {
    throw new AsrFailedError(`전사에 실패했습니다. (${json.output?.message ?? status})`);
  }
  const url = json.output?.results?.[0]?.transcription_url;
  if (!url) throw new AsrFailedError('전사 결과를 받지 못했습니다.');

  return { status: 'done', text: await readTranscript(url) };
}

/**
 * presigned 오디오 URL → Qwen 파일 전사 → 화자 라벨이 붙은 한국어 전사문.
 * 화자분리 정보가 없으면 평문 전사로 폴백한다.
 * @throws AsrFailedError 제출 거절·작업 실패·빈 결과
 * @throws AsrTimeoutError 폴링 상한 초과
 */
export async function transcribeAudioUrlWithQwen(
  audioUrl: string,
  opts: { sleep?: (ms: number) => Promise<void>; maxPolls?: number } = {}
): Promise<string> {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) throw new Error('QWEN_API_KEY is not set');

  const { sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)), maxPolls = MAX_POLLS } =
    opts;

  const taskId = await submitTask(audioUrl, apiKey);
  const result = await pollTask(taskId, apiKey, sleep, maxPolls);

  return readTranscript(result.transcription_url!);
}
