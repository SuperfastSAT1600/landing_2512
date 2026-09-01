import { describe, it, expect } from 'vitest';
import {
  buildRankedCandidates,
  reasonFromSignals,
  splitIntoChunks,
  mergeChunkPicks,
  NEUTRAL_FIT,
} from '@/lib/winback/rank';
import type { WinbackPick } from '@/lib/winback/parse';
import type { WinbackSignal } from '@/types/crm';

const SIGNALS: WinbackSignal[] = [
  { key: 'grade_exact', label: '대상 학년 일치', delta: 12 },
  { key: 'churn_unpaid', label: '미결제 이탈', delta: 10 },
];

/** 점수가 내림차순으로 미리 정렬된 후보 n명 (라우트가 넘기는 형태). */
function pool(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    score: 90 - i,
    raw_score: 90 - i,
    signals: SIGNALS,
  }));
}

function picks(entries: Array<[string, number]>): Map<string, WinbackPick> {
  return new Map(entries.map(([id, fit]) => [id, { id, fit, reason: `AI 근거 ${id}` }]));
}

describe('buildRankedCandidates', () => {
  it('LLM이 45명 중 3명만 판정해도 limit만큼 노출한다 (미판정은 규칙점수로 backfill)', () => {
    const ranked = buildRankedCandidates(
      pool(45),
      picks([
        ['s0', 5],
        ['s1', 4],
        ['s2', 3],
      ]),
      50
    );
    expect(ranked).toHaveLength(45);
  });

  it('limit이 후보 수보다 작으면 limit에서 자른다', () => {
    expect(buildRankedCandidates(pool(120), picks([['s0', 5]]), 50)).toHaveLength(50);
  });

  it('미판정 후보는 llm_fit이 null이고 근거는 규칙 신호 문구다', () => {
    const ranked = buildRankedCandidates(pool(3), picks([['s0', 5]]), 10);
    const unjudged = ranked.find((c) => c.id === 's2')!;

    expect(unjudged.llm_fit).toBeNull();
    expect(unjudged.reason).toBe('규칙 신호: 대상 학년 일치 · 미결제 이탈');
  });

  it('AI가 완전히 실패해도(판정 0건) limit만큼 규칙점수 순으로 낸다', () => {
    const ranked = buildRankedCandidates(pool(30), new Map(), 20);

    expect(ranked).toHaveLength(20);
    expect(ranked.every((c) => c.llm_fit === null)).toBe(true);
    expect(ranked.map((c) => c.id).slice(0, 3)).toEqual(['s0', 's1', 's2']);
  });

  it('같은 규칙점수면 fit이 높은 후보가 앞에 온다', () => {
    const same = [
      { id: 'low', score: 60, raw_score: 60, signals: SIGNALS },
      { id: 'high', score: 60, raw_score: 60, signals: SIGNALS },
    ];
    const ranked = buildRankedCandidates(
      same,
      picks([
        ['low', 2],
        ['high', 5],
      ]),
      10
    );

    expect(ranked.map((c) => c.id)).toEqual(['high', 'low']);
    expect(ranked[0].final).toBeGreaterThan(ranked[1].final);
  });

  it('미판정 후보는 중립 적합도로 계산해 하단으로 밀지 않는다', () => {
    const ranked = buildRankedCandidates(
      [
        { id: 'judged_low', score: 60, raw_score: 60, signals: SIGNALS },
        { id: 'unjudged', score: 60, raw_score: 60, signals: SIGNALS },
      ],
      picks([['judged_low', 2]]),
      10
    );

    expect(ranked.map((c) => c.id)).toEqual(['unjudged', 'judged_low']);
    expect(ranked[0].final).toBe(Math.round(0.75 * 60 + 0.25 * NEUTRAL_FIT * 20));
  });

  it('AI가 준 risk는 근거 문구에 붙인다', () => {
    const ranked = buildRankedCandidates(
      pool(1),
      new Map([['s0', { id: 's0', fit: 4, reason: '5월 AP 대비 필요', risk: '일정 충돌' }]]),
      10
    );
    expect(ranked[0].reason).toBe('5월 AP 대비 필요 (유의: 일정 충돌)');
  });

  it('rerank 정원 밖 후보도 결과에 포함된다', () => {
    const ranked = buildRankedCandidates(pool(60), picks([['s0', 5]]), 50);
    // s45~s59는 rerank 정원(45) 밖 — 판정이 없어도 사라지지 않는다.
    expect(ranked.some((c) => c.id === 's48')).toBe(true);
  });
});

describe('reasonFromSignals', () => {
  it('가점 신호를 최대 3개까지 나열한다', () => {
    const many: WinbackSignal[] = [
      { key: 'a', label: 'A', delta: 5 },
      { key: 'b', label: 'B', delta: 4 },
      { key: 'c', label: 'C', delta: 3 },
      { key: 'd', label: 'D', delta: 2 },
    ];
    expect(reasonFromSignals(many)).toBe('규칙 신호: A · B · C');
  });

  it('감점만 있으면 대체 문구를 쓴다', () => {
    expect(reasonFromSignals([{ key: 'x', label: 'X', delta: -10 }])).toBe(
      '규칙 점수 기준 상위 후보'
    );
  });
});

describe('splitIntoChunks', () => {
  it('정원을 묶음 크기로 쪼갠다 (마지막 묶음은 남는 만큼)', () => {
    const sizes = splitIntoChunks(pool(45), 13).map((c) => c.length);
    expect(sizes).toEqual([13, 13, 13, 6]);
  });

  it('묶음 크기보다 작으면 한 묶음이다', () => {
    expect(splitIntoChunks(pool(5), 13)).toHaveLength(1);
  });

  it('빈 배열은 묶음도 없다', () => {
    expect(splitIntoChunks([], 13)).toEqual([]);
  });
});

describe('mergeChunkPicks', () => {
  const ok = (ids: string[]) => ({ picks: ids.map((id) => ({ id, fit: 3, reason: `근거 ${id}` })) });

  it('묶음 결과를 합친다', () => {
    const merged = mergeChunkPicks([ok(['a']), ok(['b', 'c'])]);
    expect(merged.picks.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(merged.error).toBeUndefined();
  });

  it('일부 묶음이 실패해도 나머지 판정은 살린다', () => {
    const merged = mergeChunkPicks([ok(['a', 'b']), { picks: [], error: '응답 잘림' }]);

    expect(merged.picks.map((p) => p.id)).toEqual(['a', 'b']);
    expect(merged.error).toContain('1/2');
    expect(merged.error).toContain('응답 잘림');
  });

  it('전부 실패하면 판정은 비고 이유가 남는다', () => {
    const merged = mergeChunkPicks([
      { picks: [], error: 'e1' },
      { picks: [], error: 'e2' },
    ]);
    expect(merged.picks).toEqual([]);
    expect(merged.error).toContain('2/2');
  });
});
