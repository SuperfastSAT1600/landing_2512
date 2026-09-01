/**
 * Plaud 녹음 오디오 → 전사 → Qwen 4섹션 상담 메모 요약.
 * - STT: Qwen(DashScope) 파일 전사. 오디오 URL을 그대로 넘기면 되고 길이·용량 제약이 없다
 *        (상세는 `qwen-asr.ts`). 화자분리가 켜져 있어 전사문에 화자 라벨이 붙는다.
 * - 요약: Qwen(Anthropic 호환, 텍스트 전용).
 */
import { getQwenAnthropicClient } from '@/lib/qwen';
import { transcribeAudioUrlWithQwen } from '@/lib/qwen-asr';

// 요약은 qwen-plus — qwen-max보다 빠르면서 상세 메모에 충분한 품질. (최고 품질 원하면 env로 qwen-max)
const SUMMARY_MODEL = process.env.PLAUD_SUMMARY_MODEL?.trim() || 'qwen-plus';

/**
 * 크레딧/쿼터 소진으로 처리가 불가능한 상태(라우트에서 402로 매핑).
 * 429로 오지만 재시도해도 절대 풀리지 않으므로 일반 rate limit과 구분한다.
 */
export class QuotaExhaustedError extends Error {
  constructor(message = 'AI 크레딧이 소진되어 처리할 수 없습니다. 결제(크레딧)를 확인해주세요.') {
    super(message);
    this.name = 'QuotaExhaustedError';
  }
}

/**
 * 429 중 재시도가 무의미한 크레딧·쿼터 소진 오류인지 판별한다.
 * (예: `{ type: 'insufficient_quota', code: 'credit_balance_exhausted' }`)
 */
export function isQuotaError(err: unknown): boolean {
  const e = err as {
    type?: string;
    code?: string;
    error?: { type?: string; code?: string };
  } | null;
  if (!e) return false;
  const type = e.type ?? e.error?.type;
  const code = e.code ?? e.error?.code;
  return (
    type === 'insufficient_quota' ||
    code === 'insufficient_quota' ||
    code === 'credit_balance_exhausted'
  );
}

// 전사에서 곧바로 "짧지만 밀도 높은" 상담 메모를 뽑는 단일 프롬프트.
// 품질(정량·구체성)은 유지하되, 섹션·불릿 수를 강하게 제한해 한눈에 스캔되게 한다.
const SUMMARY_PROMPT = `너는 SAT 학원 세일즈 담당자를 돕는 어시스턴트다.
아래는 녹음기로 녹음·전사한 세일즈 담당자와 고객(학생/학부모)의 상담 통화 전사다.
(오탈자·잡음이 있을 수 있다. 화자는 "화자1"/"화자2"로 구분돼 있으니 문맥으로 어느 쪽이
세일즈 담당자이고 어느 쪽이 고객인지 판단하라. 화자 라벨이 없으면 문맥만으로 구분하라.)

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
 * Qwen이 한국어 요약을 쓰다 중국어로 드리프트해 같은 내용을 반복 출력하는 경우가 있다.
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
 * 크레딧 소진(429 insufficient_quota)은 재시도해도 안 풀리므로 즉시 throw.
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
      const transient =
        (status === undefined || TRANSIENT_STATUS.has(status)) && !isQuotaError(err);
      if (!transient || i === attempts - 1) throw err;
      await sleep(baseDelayMs * 2 ** i);
    }
  }
  throw lastErr;
}

/**
 * presigned 오디오 URL → 한국어 전사(화자 라벨 포함).
 * 오디오는 DashScope가 URL로 직접 가져가므로 서버가 내려받지 않는다.
 *
 * `maxPolls`는 호출자가 자기 실행 한도에 맞춰 폴링 상한을 낮출 때 쓴다
 * (백필처럼 한 요청에 여러 건을 처리하는 경로).
 */
export async function transcribeAudioUrl(
  url: string,
  opts: { maxPolls?: number } = {}
): Promise<string> {
  return transcribeAudioUrlWithQwen(url, opts);
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
 * @returns transcript(원본 전사)와 summary(상세 메모 초안)
 */
export async function summarizeTranscriptWithQwen(
  transcript: string
): Promise<{ transcript: string; summary: string }> {
  const raw = transcript.trim();
  if (!raw) throw new Error('전사 텍스트가 비어 있습니다.');

  let rawSummary: string;
  try {
    rawSummary = await withRetry(() =>
      qwenComplete(SUMMARY_PROMPT, `[상담 통화 전사]\n${raw}`, SUMMARY_MODEL)
    );
  } catch (err) {
    // 크레딧 소진은 코드 결함이 아니라 운영 상태 — 사용자에게 원인이 보이도록 전용 에러로 바꾼다.
    if (isQuotaError(err)) throw new QuotaExhaustedError();
    throw err;
  }

  const summary = keepKoreanOnly(rawSummary);
  if (!summary) throw new Error('요약 생성에 실패했습니다.');

  return { transcript: raw, summary };
}
