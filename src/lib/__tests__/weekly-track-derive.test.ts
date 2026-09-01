import { describe, it, expect } from 'vitest';
import { deriveTracksFromLegacy } from '@/lib/weekly-track-derive';
import type { WeeklyFocusStrategy, WeeklyPlanAction } from '@/types/crm';

function focus(over: Partial<WeeklyFocusStrategy> = {}): WeeklyFocusStrategy {
  return {
    id: 'f-1',
    strategy_id: 's-report',
    strategy_name: '진단리포트 당일등록 할인',
    type: 'initial_sales',
    goal: '결제 3건',
    memo: '',
    carried_from_week: null,
    ...over,
  };
}

function action(over: Partial<WeeklyPlanAction> = {}): WeeklyPlanAction {
  return { id: 'a-1', text: '자동메시지 문구 수정', done: false, done_at: null, ...over };
}

describe('deriveTracksFromLegacy', () => {
  it('집중 전략 1건을 트랙 1개로 옮긴다', () => {
    const [t] = deriveTracksFromLegacy([focus()], []);

    expect(t).toMatchObject({
      name: '진단리포트 당일등록 할인',
      goal_text: '결제 3건',
      metric: null,
      target_value: 0,
      achieved: false,
      carried_from_week: null,
    });
    expect(t.items).toHaveLength(1);
    expect(t.items[0]).toMatchObject({
      text: '진단리포트 당일등록 할인',
      done: false,
      strategy_id: 's-report',
      strategy_name: '진단리포트 당일등록 할인',
      strategy_type: 'initial_sales',
    });
  });

  it('메모는 목표 뒤에 합쳐서 보존한다', () => {
    const [t] = deriveTracksFromLegacy([focus({ goal: '결제 3건', memo: '전환율이 가장 높았음' })], []);
    expect(t.goal_text).toBe('결제 3건 — 전환율이 가장 높았음');
  });

  it('목표가 비어 있으면 메모만 목표로 쓴다', () => {
    const [t] = deriveTracksFromLegacy([focus({ goal: '', memo: '지난주에 반응 좋았음' })], []);
    expect(t.goal_text).toBe('지난주에 반응 좋았음');
  });

  it('이어받은 주차를 보존한다', () => {
    const [t] = deriveTracksFromLegacy([focus({ carried_from_week: '2026-08-10' })], []);
    expect(t.carried_from_week).toBe('2026-08-10');
  });

  it('할 일은 기타 트랙 하나로 묶고 완료 상태를 보존한다', () => {
    const tracks = deriveTracksFromLegacy([], [
      action(),
      action({ id: 'a-2', text: '진단 리포트 템플릿 수정', done: true, done_at: '2026-08-20T01:00:00Z' }),
    ]);

    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({ name: '기타', goal_text: '', metric: null });
    expect(tracks[0].items).toHaveLength(2);
    expect(tracks[0].items[1]).toMatchObject({
      text: '진단 리포트 템플릿 수정',
      done: true,
      done_at: '2026-08-20T01:00:00Z',
      strategy_id: null,
      strategy_name: null,
      strategy_type: null,
    });
  });

  it('집중 전략 트랙이 기타 트랙보다 앞에 온다', () => {
    const tracks = deriveTracksFromLegacy([focus()], [action()]);
    expect(tracks.map((t) => t.name)).toEqual(['진단리포트 당일등록 할인', '기타']);
  });

  it('둘 다 비어 있으면 빈 배열이다', () => {
    expect(deriveTracksFromLegacy([], [])).toEqual([]);
  });

  it('빈 텍스트 할 일은 버린다', () => {
    expect(deriveTracksFromLegacy([], [action({ text: '   ' })])).toEqual([]);
  });

  it('id를 그대로 재사용하지 않고 새로 만든다', () => {
    const tracks = deriveTracksFromLegacy([focus()], [action()]);
    const ids = [tracks[0].id, tracks[1].id, tracks[0].items[0].id, tracks[1].items[0].id];
    expect(new Set(ids).size).toBe(4);
  });
});
