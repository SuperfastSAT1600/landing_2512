/// <reference types="vitest/globals" />
import { groupHistoryByCategory, ORPHAN_GROUP_LABEL } from '../strategies/groupByCategory';
import type { StrategyHistoryEntry } from '@/types/crm';

const CATEGORIES = [
  { id: 'c1', name: '컨택 전략', sort_order: 0 },
  { id: 'c2', name: '첫 세일즈콜', sort_order: 1 },
  { id: 'c3', name: '진단 Report 세일즈 전략', sort_order: 2 },
];

const STRATEGIES = [
  { id: 's1', name: '개인화 메시지', category_id: 'c1' },
  { id: 's2', name: '바로 상담 전화 진행', category_id: 'c1' },
  { id: 's3', name: '진단 테스트를 통한 로드맵 안내 유도', category_id: 'c2' },
  { id: 's4', name: '1400점 정체 + 시간 부족 프레임', category_id: 'c3' },
];

const entry = (id: string, strategy_id: string): StrategyHistoryEntry => ({
  id,
  strategy_id,
  strategy_name: 'snapshot',
  applied_at: '2026-07-01T00:00:00Z',
  memo: '',
});

describe('groupHistoryByCategory', () => {
  it('카테고리 순서(sort_order)대로 그룹을 만든다 — 전략이 없어도 그룹은 나온다', () => {
    const out = groupHistoryByCategory([], CATEGORIES, STRATEGIES);
    expect(out.map((g) => g.label)).toEqual(['컨택 전략', '첫 세일즈콜', '진단 Report 세일즈 전략']);
  });

  it('엔트리를 전략의 현재 카테고리로 귀속시킨다 — kind는 보지 않는다', () => {
    const out = groupHistoryByCategory(
      [entry('e1', 's1'), entry('e2', 's3'), entry('e3', 's4')],
      CATEGORIES,
      STRATEGIES
    );
    expect(out.find((g) => g.id === 'c1')!.entries.map((e) => e.id)).toEqual(['e1']);
    expect(out.find((g) => g.id === 'c2')!.entries.map((e) => e.id)).toEqual(['e2']);
    expect(out.find((g) => g.id === 'c3')!.entries.map((e) => e.id)).toEqual(['e3']);
  });

  it('삭제된 전략을 가리키는 엔트리는 마지막 "분류 없음" 그룹에 모은다 (REQ-005)', () => {
    const out = groupHistoryByCategory([entry('e1', 's1'), entry('e9', 'gone')], CATEGORIES, STRATEGIES);
    const last = out[out.length - 1];
    expect(last.label).toBe(ORPHAN_GROUP_LABEL);
    expect(last.entries.map((e) => e.id)).toEqual(['e9']);
    expect(last.addable).toBe(false);
  });

  it('끊긴 엔트리가 없으면 "분류 없음" 그룹 자체를 만들지 않는다', () => {
    const out = groupHistoryByCategory([entry('e1', 's1')], CATEGORIES, STRATEGIES);
    expect(out.some((g) => g.label === ORPHAN_GROUP_LABEL)).toBe(false);
  });

  it('엔트리 총 개수가 그룹 합계와 일치한다 — 어떤 기록도 잃지 않는다', () => {
    const entries = [entry('e1', 's1'), entry('e2', 's3'), entry('e9', 'gone'), entry('e8', 'gone2')];
    const out = groupHistoryByCategory(entries, CATEGORIES, STRATEGIES);
    expect(out.reduce((n, g) => n + g.entries.length, 0)).toBe(entries.length);
  });

  it('그룹마다 추가 가능한 전략 목록을 함께 준다', () => {
    const out = groupHistoryByCategory([], CATEGORIES, STRATEGIES);
    expect(out.find((g) => g.id === 'c1')!.strategies.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(out.find((g) => g.id === 'c3')!.strategies.map((s) => s.id)).toEqual(['s4']);
  });
});

describe('groupHistoryByCategory — 진행 전/후 슬롯', () => {
  const withPhase = (id: string, strategy_id: string, phase: 'planned' | 'applied') =>
    ({ ...entry(id, strategy_id), phase });

  it('계획·실제를 각 슬롯에 나눠 담는다', () => {
    const out = groupHistoryByCategory(
      [withPhase('e1', 's1', 'planned'), withPhase('e2', 's2', 'applied')],
      CATEGORIES,
      STRATEGIES
    );
    const g = out.find((x) => x.id === 'c1')!;
    expect(g.planned?.id).toBe('e1');
    expect(g.applied?.id).toBe('e2');
  });

  it('phase 없는 기존 기록은 실제 슬롯에 들어간다', () => {
    const g = groupHistoryByCategory([entry('e1', 's1')], CATEGORIES, STRATEGIES).find((x) => x.id === 'c1')!;
    expect(g.applied?.id).toBe('e1');
    expect(g.planned).toBeNull();
  });

  it('같은 슬롯에 2건이 있으면 최신(applied_at) 하나만 슬롯에 오른다', () => {
    const older = { ...withPhase('old', 's1', 'applied'), applied_at: '2026-07-01T00:00:00Z' };
    const newer = { ...withPhase('new', 's2', 'applied'), applied_at: '2026-07-09T00:00:00Z' };
    const g = groupHistoryByCategory([newer, older], CATEGORIES, STRATEGIES).find((x) => x.id === 'c1')!;
    expect(g.applied?.id).toBe('new');
    expect(g.entries).toHaveLength(2); // 총계는 잃지 않는다
  });

  it('빈 슬롯은 null', () => {
    const g = groupHistoryByCategory([], CATEGORIES, STRATEGIES).find((x) => x.id === 'c1')!;
    expect(g.planned).toBeNull();
    expect(g.applied).toBeNull();
  });

  it('분류 없음 그룹에도 슬롯 키가 있고 둘 다 null — 렌더가 분기 없이 돌아간다', () => {
    const out = groupHistoryByCategory([entry('e9', 'gone')], CATEGORIES, STRATEGIES);
    const orphan = out[out.length - 1];
    expect(orphan.planned).toBeNull();
    expect(orphan.applied).toBeNull();
    expect(orphan.entries).toHaveLength(1);
  });
});
