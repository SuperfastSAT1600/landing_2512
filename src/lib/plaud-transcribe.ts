/**
 * Plaud 녹음 오디오 → 전사 → Qwen 4섹션 상담 메모 요약 (자체완결형).
 * - STT: OpenAI gpt-4o-transcribe. 24MB 초과 MP3는 프레임 경계로 청크 분할해 청크별 전사 후 이어붙인다.
 *        非MP3 초과분은 폴백 없이 AudioTooLargeError, 너무 길면(청크 6개 초과) AudioTooLongError.
 * - 화자분리·요약: Qwen(Anthropic 호환, 텍스트 전용).
 */
import OpenAI, { toFile } from 'openai';
import { getQwenAnthropicClient } from '@/lib/qwen';
import { isMp3, chunkMp3ByFrames } from '@/lib/mp3-chunk';

// STT·요약 모델은 env로 조정 가능(속도/품질 튜닝).
// STT는 gpt-4o-transcribe 유지 — gpt-4o-mini-transcribe는 일부 녹음에서 같은 문장을 무한 반복하는
// 전사 루프 결함이 있어 정확도를 깨뜨린다(속도 이득도 미미). 정확도 우선.
const STT_MODEL = process.env.PLAUD_STT_MODEL?.trim() || 'gpt-4o-transcribe';
// 요약은 qwen-plus — qwen-max보다 빠르면서 상세 메모에 충분한 품질. (최고 품질 원하면 env로 qwen-max)
const SUMMARY_MODEL = process.env.PLAUD_SUMMARY_MODEL?.trim() || 'qwen-plus';

/** 단일 요청 STT 캡(OpenAI 25MB 아래). 이하 녹음은 한 번에 전사, 초과 MP3는 청크 분할. */
export const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
/** 청크 목표 크기(OpenAI 25MB 여유 두고). */
const CHUNK_TARGET_BYTES = 23 * 1024 * 1024;
/**
 * 청크 목표 길이(초). gpt-4o-transcribe는 요청당 1400초 길이 제한이 있어(파일크기와 별개),
 * 바이트뿐 아니라 길이로도 잘라야 한다. 여유 두고 1200초(20분).
 */
const CHUNK_TARGET_SECONDS = 1200;
/** 청크 최대 개수(20분×4=약 80분). 초과는 300s 내 처리 어려워 거절. */
const MAX_CHUNKS = 4;
/**
 * 청크 전사 동시성. 20분 청크 1개 STT가 ~130s라, MAX_CHUNKS(4)를 한 배치로 병렬 처리해
 * wall-clock을 청크 수와 무관하게 ~1회분(~150s)으로 묶는다(300s serverless 여유). withRetry가 429 흡수.
 */
const CHUNK_CONCURRENCY = 4;

/** 전사 불가(非MP3 초과 등)를 알리는 에러(라우트에서 413으로 매핑). */
export class AudioTooLargeError extends Error {
  constructor(message = '녹음이 24MB를 초과해 전사할 수 없습니다.') {
    super(message);
    this.name = 'AudioTooLargeError';
  }
}

/** 녹음이 너무 길어(청크 상한 초과) 전사 불가. AudioTooLargeError 하위 → 라우트가 동일하게 413 처리. */
export class AudioTooLongError extends AudioTooLargeError {
  constructor() {
    super('녹음이 너무 길어 전사할 수 없습니다. (약 80분 이하만 지원)');
    this.name = 'AudioTooLongError';
  }
}

// 화자 미구분 전사에서 곧바로 "짧지만 밀도 높은" 상담 메모를 뽑는 단일 프롬프트.
// 품질(정량·구체성)은 유지하되, 섹션·불릿 수를 강하게 제한해 한눈에 스캔되게 한다.
const SUMMARY_PROMPT = `너는 SAT 학원 세일즈 담당자를 돕는 어시스턴트다.
아래는 녹음기로 녹음·전사한 세일즈 담당자와 고객(학생/학부모)의 상담 통화 전사다.
(오탈자·잡음이 있고 화자가 구분돼 있지 않다 — 문맥으로 세일즈 담당자와 고객을 구분해 파악하라.)

바쁜 관리자가 10초 안에 훑어 핵심을 파악하는 **아주 짧은** 한국어 "상담 메모"를 작성하라.
짧되, 담긴 사실은 구체적이고 정확해야 한다.

규칙:
- **메모는 반드시 "[핵심 요약]" 줄로 시작하고, 그 아래 1~2문장으로 무슨 상담·학생 목표·결론을 쓴다. 비워두지 마라.**
- **반드시 한국어로만 작성한다. 다른 언어(중국어 등) 절대 금지.** (SAT 용어·영문 약어는 예외.) 반복 금지.
- **아주 간결하게.** 각 불릿은 한 줄, **되도록 40자 이내**. 각 섹션 **최대 3불릿**. 배경설명·부연·군더더기·중복은 과감히 버린다. 안 중요하면 뺀다.
- **핵심 숫자는 반드시 살린다** — 목표 점수, 현재 점수, 시험일·마감일, 수업 횟수 등. 단, 전사에 실제 나온 수치만 쓰고 없는 숫자를 지어내지 마라.
- 문제점·니즈는 뭉뚱그리지 말고 짧고 구체적으로(영역·유형). 예: "영어 부족"(X) → "RW 추론·어휘 유형 약함"(O).
- 전사에 없는 내용을 지어내거나 추측하지 마라("~일 가능성" 금지).
- 아래 4개 섹션만 쓴다. 내용이 없는 섹션은 통째로 뺀다(없다고 설명하지 마라).
- 메모 본문만 출력하고 다른 설명·머리말은 붙이지 마라.

[핵심 요약]
(반드시 작성, 1~2문장. 무슨 상담, 학생 목표, 결론/합의)

[현황]
- (학년·현재 점수/실력·목표 점수·시험 일정 중 핵심만, 최대 3불릿)

[니즈·문제]
- (목표 대비 부족한 영역·유형, 우려 — 짧고 구체적으로 최대 3불릿)

[다음 액션]
- (제안·정해진 것·후속 조치·기한 — 최대 3불릿)`;

/**
 * Qwen(qwen-max)이 한국어 요약을 쓰다 중국어로 드리프트해 같은 내용을 반복 출력하는 경우가 있다.
 * 한국어 상담 메모에는 한자(CJK 표의문자)가 거의 없으므로, 한자가 많은 줄이 처음 나오면
 * 그 줄부터 끝까지 잘라내 한국어 부분만 남긴다(출력 계약: 한국어만).
 */
function keepKoreanOnly(text: string): string {
  const isChineseLine = (line: string) => (line.match(/[一-鿿]/g)?.length ?? 0) >= 4;
  const lines = text.split('\n');
  const cut = lines.findIndex(isChineseLine);
  return (cut === -1 ? lines : lines.slice(0, cut)).join('\n').trim();
}

// 일시적으로 보고 재시도하는 상태 코드 (rate limit·서버 과부하).
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);

/**
 * 일시적(429/5xx·네트워크) 오류면 지수 백오프로 재시도하고, 영구 오류는 즉시 throw.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number; sleep?: (ms: number) => Promise<void> } = {}
): Promise<T> {
  const {
    attempts = 3,
    baseDelayMs = 500,
    sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  } = opts;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number } | null)?.status;
      const transient = status === undefined || TRANSIENT_STATUS.has(status);
      if (!transient || i === attempts - 1) throw err;
      await sleep(baseDelayMs * 2 ** i);
    }
  }
  throw lastErr;
}

/** OpenAI 전사가 지원하는 확장자 → 정규 오디오 mime. */
const EXT_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  mpga: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  wav: 'audio/wav',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  flac: 'audio/flac',
};

/**
 * STT용 mime·파일명 결정. presigned URL의 경로 확장자를 우선 신뢰한다
 * (S3가 content-type을 `binary/octet-stream`으로 내려주는 경우가 있어 그것만으론 포맷 판별 불가).
 * URL로 못 정하면 content-type으로, 그래도 모르면 mp3로 가정한다.
 */
function mimeFilename(url: string, contentType: string): { mime: string; filename: string } {
  const urlExt = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? '';
  if (EXT_MIME[urlExt]) return { mime: EXT_MIME[urlExt], filename: `plaud.${urlExt}` };

  const ct = contentType.split(';')[0].trim().toLowerCase();
  const ext = ct.includes('webm')
    ? 'webm'
    : ct.includes('ogg')
      ? 'ogg'
      : ct.includes('wav')
        ? 'wav'
        : ct.includes('mp4') || ct.includes('m4a')
          ? 'm4a'
          : 'mp3'; // mpeg/mp3 및 알 수 없는 타입(binary/octet-stream 등)은 mp3로 가정
  return { mime: EXT_MIME[ext], filename: `plaud.${ext}` };
}

/** 단일 오디오 버퍼를 OpenAI로 한국어 전사한다(트림된 텍스트). */
async function transcribeBuffer(
  buffer: Buffer,
  url: string,
  contentType: string,
  openai: OpenAI
): Promise<string> {
  const { mime, filename } = mimeFilename(url, contentType);
  const file = await toFile(buffer, filename, { type: mime });
  const r = await withRetry(() =>
    openai.audio.transcriptions.create({ file, model: STT_MODEL, language: 'ko' })
  );
  return r.text.trim();
}

/** 청크들을 동시성 제한 배치로 전사하고 index 순서를 보존해 텍스트 배열로 반환한다. */
async function transcribeChunks(
  chunks: Buffer[],
  url: string,
  contentType: string,
  openai: OpenAI
): Promise<string[]> {
  const out: string[] = new Array(chunks.length);
  for (let i = 0; i < chunks.length; i += CHUNK_CONCURRENCY) {
    const batch = chunks.slice(i, i + CHUNK_CONCURRENCY);
    const texts = await Promise.all(
      batch.map((c) => transcribeBuffer(c, url, contentType, openai))
    );
    texts.forEach((t, j) => {
      out[i + j] = t;
    });
  }
  return out;
}

/**
 * presigned 오디오 URL → 다운로드 → OpenAI 한국어 전사.
 * ≤24MB는 단일 전사. 초과 MP3는 프레임 경계로 청크 분할해 청크별 전사 후 순서대로 이어붙인다.
 * @throws AudioTooLargeError 24MB 초과인데 청크 분할 불가한 포맷(非MP3)일 때
 * @throws AudioTooLongError  청크가 MAX_CHUNKS(≈80분)를 초과할 때
 */
export async function transcribeAudioUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`오디오 다운로드 실패: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  const contentType = res.headers.get('content-type') ?? '';
  const openai = new OpenAI({ apiKey });

  // 단일 요청 한도 이하: 기존 단일 전사 경로.
  if (buffer.byteLength <= MAX_AUDIO_BYTES) {
    return transcribeBuffer(buffer, url, contentType, openai);
  }

  // 초과: MP3만 프레임 경계 분할 가능. 그 외 포맷은 전사 불가.
  if (!isMp3(buffer)) throw new AudioTooLargeError();

  let chunks: Buffer[];
  try {
    chunks = chunkMp3ByFrames(buffer, CHUNK_TARGET_BYTES, CHUNK_TARGET_SECONDS);
  } catch {
    // 안전하게 분할 못 하면 기존 동작(전사 불가)으로 폴백.
    throw new AudioTooLargeError();
  }
  if (chunks.length > MAX_CHUNKS) throw new AudioTooLongError();

  const texts = await transcribeChunks(chunks, url, contentType, openai);
  return texts.join('\n').trim();
}

/** Qwen(텍스트) 1회 완성. system/user를 Anthropic 호환 messages로 보낸다. */
async function qwenComplete(system: string, user: string, model: string): Promise<string> {
  const client = getQwenAnthropicClient();
  const resp = await client.messages.create({
    model,
    max_tokens: 700, // 아주 짧은 메모 상한 — 장황함 물리적 차단 + 속도 확보
    system: [{ type: 'text', text: system }],
    messages: [{ role: 'user', content: user }],
  });
  return resp.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('')
    .trim();
}

/**
 * 전사 텍스트 → Qwen 상세 상담 메모(단일 호출).
 * 별도 화자분리 호출은 최종 메모에 쓰이지 않아 제거했다(속도↑). 화자 구분은 요약 프롬프트가 문맥으로 처리.
 * @returns transcript(원본 전사)와 summary(상세 메모 초안)
 */
export async function summarizeTranscriptWithQwen(
  transcript: string
): Promise<{ transcript: string; summary: string }> {
  const raw = transcript.trim();
  if (!raw) throw new Error('전사 텍스트가 비어 있습니다.');

  const rawSummary = await withRetry(() =>
    qwenComplete(SUMMARY_PROMPT, `[상담 통화 전사]\n${raw}`, SUMMARY_MODEL)
  );
  const summary = keepKoreanOnly(rawSummary);
  if (!summary) throw new Error('요약 생성에 실패했습니다.');

  return { transcript: raw, summary };
}
