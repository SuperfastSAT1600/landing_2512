import { describe, it, expect } from 'vitest';
import {
  buildMirrorMemo,
  reactivationStrategyLabel,
  reactivationOutcomeFor,
  assignVariants,
} from '@/lib/winback/mirror';

describe('buildMirrorMemo / reactivationStrategyLabel', () => {
  it('상담 타임라인 미러 메모에 플레이·변형·문구가 담긴다', () => {
    const memo = buildMirrorMemo({
      playTitle: '5월 AP Calc 윈백',
      variantName: '가격 민감형',
      message: '어머님 안녕하세요, 지난 상담 이후...',
    });
    expect(memo).toContain('윈백 발송');
    expect(memo).toContain('5월 AP Calc 윈백');
    expect(memo).toContain('가격 민감형');
    expect(memo).toContain('어머님 안녕하세요');
  });

  it('문구가 없으면 발송 사실만 남긴다', () => {
    const memo = buildMirrorMemo({ playTitle: 'P', variantName: null, message: null });
    expect(memo).toContain('P');
    expect(memo.trim().endsWith('P')).toBe(true);
  });

  it('재활성화 로그 전략 라벨은 윈백임을 명시한다', () => {
    expect(reactivationStrategyLabel('P', '변형A')).toBe('[윈백] P / 변형A');
    expect(reactivationStrategyLabel('P', null)).toBe('[윈백] P');
  });
});

describe('reactivationOutcomeFor', () => {
  it('전환·재연결·긍정 반응은 reactivated', () => {
    expect(reactivationOutcomeFor({ converted_at: '2026-08-20T00:00:00Z' })).toBe('reactivated');
    expect(reactivationOutcomeFor({ reconnected_at: '2026-08-15T00:00:00Z' })).toBe('reactivated');
    expect(reactivationOutcomeFor({ response: 'positive' })).toBe('reactivated');
  });

  it('거절은 rejected, 무응답은 no_response', () => {
    expect(reactivationOutcomeFor({ response: 'negative' })).toBe('rejected');
    expect(reactivationOutcomeFor({ response: 'none' })).toBe('no_response');
  });

  it('보류(later)와 미마킹은 pending', () => {
    expect(reactivationOutcomeFor({ response: 'later' })).toBe('pending');
    expect(reactivationOutcomeFor({})).toBe('pending');
  });

  it('전환이 있으면 부정 반응보다 전환이 이긴다', () => {
    expect(
      reactivationOutcomeFor({ response: 'negative', converted_at: '2026-08-20T00:00:00Z' })
    ).toBe('reactivated');
  });
});

describe('assignVariants', () => {
  it('변형을 균등하게 라운드로빈 배정한다', () => {
    const map = assignVariants(['s1', 's2', 's3', 's4', 's5'], ['v1', 'v2']);
    expect([...map.values()]).toEqual(['v1', 'v2', 'v1', 'v2', 'v1']);
  });

  it('변형이 없으면 전부 null (변형 미지정 버킷)', () => {
    const map = assignVariants(['s1', 's2'], []);
    expect([...map.values()]).toEqual([null, null]);
  });

  it('학생이 없으면 빈 맵', () => {
    expect(assignVariants([], ['v1']).size).toBe(0);
  });

  it('startIndex를 주면 이어서 배정한다 — 리드를 나중에 더 담아도 균형이 유지된다', () => {
    const map = assignVariants(['s3', 's4'], ['v1', 'v2'], 1);
    expect([...map.values()]).toEqual(['v2', 'v1']);
  });
});
