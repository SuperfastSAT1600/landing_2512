import { describe, it, expect } from 'vitest';
import { POLL_INTERVAL_MS } from '@/lib/qwen-asr';
import {
  BACKFILL_BUDGET_MS,
  BACKFILL_MAX_POLLS,
  BACKFILL_MAX_DURATION_S,
} from '@/lib/plaud-backfill-limits';

describe('백필 시간 배분', () => {
  it('예산 직전에 시작한 전사까지 maxDuration 안에 끝난다', () => {
    // outOfTime()은 새 전사를 "시작"하는 것만 막고 진행 중인 전사를 끊지 않는다.
    // 따라서 최악은 예산을 꽉 채운 순간 시작된 전사가 폴링 상한을 다 쓰는 경우다.
    const worstCaseMs = BACKFILL_BUDGET_MS + BACKFILL_MAX_POLLS * POLL_INTERVAL_MS;

    expect(worstCaseMs).toBeLessThan(BACKFILL_MAX_DURATION_S * 1000);
    // 응답 직렬화·네트워크 여유분 20s 이상을 남긴다.
    expect(BACKFILL_MAX_DURATION_S * 1000 - worstCaseMs).toBeGreaterThanOrEqual(20_000);
  });

  it('한 배치에서 최소 한 건은 전사할 시간이 있다', () => {
    expect(BACKFILL_BUDGET_MS).toBeGreaterThan(BACKFILL_MAX_POLLS * POLL_INTERVAL_MS);
  });
});
