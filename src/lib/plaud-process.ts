/**
 * Plaud 녹음 처리 오케스트레이션: 오디오 → 전사 → Qwen 4섹션 요약.
 * 24MB 초과는 폴백 없이 AudioTooLargeError를 전파한다(호출부에서 413 매핑).
 */
import { transcribeAudioUrl, summarizeTranscriptWithQwen } from '@/lib/plaud-transcribe';

/**
 * presigned 오디오 URL을 전사·요약해 상담 메모 초안 재료를 만든다.
 * @throws AudioTooLargeError 24MB 초과 시
 */
export async function processPlaudRecording(input: {
  audioUrl: string;
}): Promise<{ transcript: string; summary: string }> {
  const rawTranscript = await transcribeAudioUrl(input.audioUrl);
  return summarizeTranscriptWithQwen(rawTranscript);
}
