import OpenAI, { toFile } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// STT: 브라우저 녹음 포맷(webm/mp4/m4a)을 그대로 받는 OpenAI 전사 모델.
// (Gemini 오디오 입력은 webm 미지원이라 전사는 OpenAI, 요약은 Gemini로 분담)
const STT_MODEL = 'gpt-4o-transcribe';
// 요약: 전사 텍스트 → 구조화 상담 메모.
const SUMMARY_MODEL = 'gemini-2.5-flash';

const SUMMARY_PROMPT = `너는 SAT 학원 세일즈 상담사를 돕는 어시스턴트다.
아래는 상담사와 고객(학생/학부모)의 전화 상담 전사 내용이다.
(스피커폰을 마이크로 녹음·전사한 것이라 오탈자·잡음 섞임이 있을 수 있다.)

이 내용을 바탕으로 한국어 "상담 메모"를 작성해라. 규칙:
- 아래 4개 섹션 머리말을 그대로 쓰되, 내용이 없는 섹션은 생략한다.
- 각 항목은 간결한 한 줄 불릿(-). 인사말·군더더기 제외, 사실 위주.
- 전사에 없는 내용을 추측하지 말 것.
- 메모 본문만 출력하고 다른 설명·머리말은 붙이지 마라.

[핵심 니즈]
- (고객이 원하는 것, 목표 점수/일정, 상황)

[우려·이의]
- (가격/시간/효과 등 망설이는 지점)

[합의 사항]
- (이번 통화에서 정해진 것)

[다음 액션]
- (상담사가 다음에 할 일, 약속한 후속 조치)`;

/** OpenAI로 통화 오디오를 한국어 전사. 브라우저 포맷(webm/mp4)을 그대로 처리. */
async function transcribeCall(audio: Buffer, mimeType: string, filename: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  const openai = new OpenAI({ apiKey });
  // codecs 파라미터 제거한 베이스 MIME (예: audio/webm;codecs=opus → audio/webm)
  const baseMime = mimeType.split(';')[0].trim();
  const file = await toFile(audio, filename, { type: baseMime });
  const res = await openai.audio.transcriptions.create({
    file,
    model: STT_MODEL,
    language: 'ko',
  });
  return res.text.trim();
}

/** Gemini로 전사 텍스트를 구조화 상담 메모로 요약. */
async function summarizeTranscript(transcript: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: SUMMARY_MODEL });
  const result = await model.generateContent(`${SUMMARY_PROMPT}\n\n[통화 전사]\n${transcript}`);
  return result.response.text().trim();
}

/**
 * 통화 오디오 → 한국어 전사 → 구조화 상담 메모.
 * @returns transcript(원문 전사)와 summary(메모 초안)
 */
export async function transcribeAndSummarizeCall(
  audio: Buffer,
  mimeType: string,
  filename: string
): Promise<{ transcript: string; summary: string }> {
  const transcript = await transcribeCall(audio, mimeType, filename);
  if (!transcript) throw new Error('전사 결과가 비어 있습니다. 통화 내용을 인식하지 못했습니다.');
  const summary = await summarizeTranscript(transcript);
  if (!summary) throw new Error('요약 생성에 실패했습니다.');
  return { transcript, summary };
}
