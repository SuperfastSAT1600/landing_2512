import { describe, it, expect, vi, beforeEach } from 'vitest';

const { transcribeAudioUrl, summarizeTranscriptWithQwen, AudioTooLargeError } = vi.hoisted(() => {
  class AudioTooLargeError extends Error {
    constructor() {
      super('too large');
      this.name = 'AudioTooLargeError';
    }
  }
  return {
    transcribeAudioUrl: vi.fn(),
    summarizeTranscriptWithQwen: vi.fn(),
    AudioTooLargeError,
  };
});

vi.mock('@/lib/plaud-transcribe', () => ({
  transcribeAudioUrl,
  summarizeTranscriptWithQwen,
  AudioTooLargeError,
}));

import { processPlaudRecording } from '@/lib/plaud-process';

describe('processPlaudRecording', () => {
  beforeEach(() => vi.clearAllMocks());

  it('오디오 전사 → 요약 → {transcript, summary} 반환', async () => {
    transcribeAudioUrl.mockResolvedValueOnce('세일즈: 안녕');
    summarizeTranscriptWithQwen.mockResolvedValueOnce({
      transcript: '세일즈 담당자: 안녕',
      summary: '[핵심 니즈]\n- 목표',
    });

    const r = await processPlaudRecording({ audioUrl: 'https://x/a.m4a' });

    expect(transcribeAudioUrl).toHaveBeenCalledWith('https://x/a.m4a');
    expect(summarizeTranscriptWithQwen).toHaveBeenCalledWith('세일즈: 안녕');
    expect(r.summary).toContain('핵심 니즈');
  });

  it('24MB 초과(AudioTooLargeError)는 그대로 전파, 요약 호출 안 함', async () => {
    transcribeAudioUrl.mockRejectedValueOnce(new AudioTooLargeError());
    await expect(processPlaudRecording({ audioUrl: 'https://x/big.m4a' })).rejects.toBeInstanceOf(
      AudioTooLargeError,
    );
    expect(summarizeTranscriptWithQwen).not.toHaveBeenCalled();
  });
});
