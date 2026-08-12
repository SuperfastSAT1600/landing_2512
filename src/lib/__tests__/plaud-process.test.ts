import { describe, it, expect, vi, beforeEach } from 'vitest';

const { transcribeAudioUrl, summarizeTranscriptWithQwen, AsrFailedError } = vi.hoisted(() => {
  class AsrFailedError extends Error {
    constructor() {
      super('전사 실패');
      this.name = 'AsrFailedError';
    }
  }
  return {
    transcribeAudioUrl: vi.fn(),
    summarizeTranscriptWithQwen: vi.fn(),
    AsrFailedError,
  };
});

vi.mock('@/lib/plaud-transcribe', () => ({
  transcribeAudioUrl,
  summarizeTranscriptWithQwen,
}));

import { processPlaudRecording } from '@/lib/plaud-process';

describe('processPlaudRecording', () => {
  beforeEach(() => vi.clearAllMocks());

  it('오디오 전사 → 요약 → {transcript, summary} 반환', async () => {
    transcribeAudioUrl.mockResolvedValueOnce('화자1: 안녕');
    summarizeTranscriptWithQwen.mockResolvedValueOnce({
      transcript: '화자1: 안녕',
      summary: '[핵심 요약]\n- 목표',
    });

    const r = await processPlaudRecording({ audioUrl: 'https://x/a.mp3' });

    expect(transcribeAudioUrl).toHaveBeenCalledWith('https://x/a.mp3');
    expect(summarizeTranscriptWithQwen).toHaveBeenCalledWith('화자1: 안녕');
    expect(r.summary).toContain('핵심 요약');
  });

  it('전사 실패는 그대로 전파, 요약 호출 안 함', async () => {
    transcribeAudioUrl.mockRejectedValueOnce(new AsrFailedError());
    await expect(processPlaudRecording({ audioUrl: 'https://x/a.mp3' })).rejects.toBeInstanceOf(
      AsrFailedError
    );
    expect(summarizeTranscriptWithQwen).not.toHaveBeenCalled();
  });
});
