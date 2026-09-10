/**
 * Plaud 녹음 처리 오케스트레이션: 오디오 → Qwen 전사(화자분리) → Qwen 4섹션 요약.
 * 전사 실패(AsrFailedError)는 그대로 전파한다(호출부에서 502 매핑).
 */
import { transcribeAudioUrl, summarizeTranscriptWithQwen } from '@/lib/plaud-transcribe';

/**
 * presigned 오디오 URL을 전사·요약해 상담 메모 초안 재료를 만든다.
 * @throws AsrFailedError 전사 실패·타임아웃 시
 */
export async function processPlaudRecording(input: {
  audioUrl: string;
}): Promise<{ transcript: string; summary: string }> {
  const rawTranscript = await transcribeAudioUrl(input.audioUrl);
  return summarizeTranscriptWithQwen(rawTranscript);
}
