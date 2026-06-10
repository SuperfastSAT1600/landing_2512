import OpenAI, { toFile } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// STT: 브라우저 녹음 포맷(webm/mp4/m4a)을 그대로 받는 OpenAI 전사 모델.
// (Gemini 오디오 입력은 webm 미지원이라 전사는 OpenAI, 화자분리·요약은 Gemini로 분담)
const STT_MODEL = 'gpt-4o-transcribe';
const GEMINI_MODEL = 'gemini-2.5-flash';

const LABEL_PROMPT = `다음은 SAT 학원 상담사와 고객(학생/학부모)의 전화 상담 전사다.
(스피커폰을 마이크로 녹음·전사한 것이라 오탈자·잡음 섞임이 있을 수 있다.)
화자를 구분해 각 발화 앞에 "상담사:" 또는 "고객:" 라벨을 붙여 대화 형식으로 다시 정리해라.
규칙:
- 내용·표현은 최대한 그대로 두고 화자만 구분한다(요약·생략 금지).
- 누가 말했는지는 문맥으로 추정한다(상담사는 학원 측, 고객은 학생/학부모).
- 라벨된 전사만 출력하고 다른 설명은 붙이지 마라.`;

const SUMMARY_PROMPT = `너는 SAT 학원 세일즈 상담사를 돕는 어시스턴트다.
아래는 화자 구분된 전화 상담 전사다. 이를 바탕으로 한국어 "상담 메모"를 작성해라. 규칙:
- 아래 4개 섹션 머리말을 그대로 쓰되, 내용이 없는 섹션은 생략한다.
- 각 항목은 간결한 한 줄 불릿(-). 인사말·군더더기 제외, 사실 위주.
- 전사에 없는 내용을 추측하지 말 것.
- "고객" 발화에서 니즈·우려를, "상담사" 발화에서 합의·다음 액션을 우선 파악한다.
- 메모 본문만 출력하고 다른 설명·머리말은 붙이지 마라.

[핵심 니즈]
- (고객이 원하는 것, 목표 점수/일정, 상황)

[우려·이의]
- (가격/시간/효과 등 망설이는 지점)

[합의 사항]
- (이번 통화에서 정해진 것)

[다음 액션]
- (상담사가 다음에 할 일, 약속한 후속 조치)`;

export interface AudioSegment {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

function geminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: GEMINI_MODEL });
}

/** OpenAI로 오디오 1개를 한국어 전사. 브라우저 포맷(webm/mp4)을 그대로 처리. */
async function transcribeOne(seg: AudioSegment): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  const openai = new OpenAI({ apiKey });
  const baseMime = seg.mimeType.split(';')[0].trim();
  const file = await toFile(seg.buffer, seg.filename, { type: baseMime });
  const res = await openai.audio.transcriptions.create({ file, model: STT_MODEL, language: 'ko' });
  return res.text.trim();
}

/** Gemini로 화자(상담사/고객)를 구분한 전사로 재구성. */
async function labelSpeakers(rawTranscript: string): Promise<string> {
  const result = await geminiModel().generateContent(`${LABEL_PROMPT}\n\n[전사]\n${rawTranscript}`);
  return result.response.text().trim();
}

/** Gemini로 화자 구분 전사를 구조화 상담 메모로 요약. */
async function summarize(labeledTranscript: string): Promise<string> {
  const result = await geminiModel().generateContent(`${SUMMARY_PROMPT}\n\n[화자 구분 전사]\n${labeledTranscript}`);
  return result.response.text().trim();
}

/**
 * 통화 오디오(1개 이상 세그먼트) → 한국어 전사 → 화자 분리 → 구조화 상담 메모.
 * 세그먼트는 녹음 순서대로 전달해야 한다(긴 통화 분할 대응).
 * @returns transcript(화자 라벨링된 전사)와 summary(메모 초안)
 */
export async function transcribeAndSummarizeCall(
  segments: AudioSegment[]
): Promise<{ transcript: string; summary: string }> {
  if (segments.length === 0) throw new Error('오디오 세그먼트가 없습니다.');

  // 세그먼트별 전사 (병렬) → 순서대로 결합
  const parts = await Promise.all(segments.map(transcribeOne));
  const rawTranscript = parts.join('\n').trim();
  if (!rawTranscript) throw new Error('전사 결과가 비어 있습니다. 통화 내용을 인식하지 못했습니다.');

  const transcript = await labelSpeakers(rawTranscript);
  const summary = await summarize(transcript || rawTranscript);
  if (!summary) throw new Error('요약 생성에 실패했습니다.');

  return { transcript: transcript || rawTranscript, summary };
}
