import { describe, it, expect } from 'vitest';
import { buildPlanPatch, normalizePlanRow } from '../sanitize';

describe('buildPlanPatch — body에 있는 키만 반영(부분 업데이트)', () => {
  it('회고만 보내면 targets·actions는 패치에 들어가지 않는다', () => {
    const patch = buildPlanPatch({
      retrospective: { went_well: '잘됨', went_wrong: '', next_actions: [] },
    });
    expect(Object.keys(patch)).toEqual(['retrospective']);
    expect(patch.retrospective?.went_well).toBe('잘됨');
    expect(patch.retrospective?.updated_at).toMatch(/^\d{4}-/);
  });

  it('빈 body는 빈 패치', () => {
    expect(buildPlanPatch({})).toEqual({});
  });

  it('targets는 유효 지표 키만 남기고 숫자로 변환한다', () => {
    const patch = buildPlanPatch({
      targets: [
        { key: 'paid', label: '결제', target_value: '3' },
        { key: 'bogus', label: '없는지표', target_value: 5 },
      ],
    });
    expect(patch.targets).toEqual([{ key: 'paid', label: '결제', target_value: 3 }]);
  });

  it('actions는 id·text 있는 항목만 남기고 done_at을 보정한다', () => {
    const patch = buildPlanPatch({
      actions: [
        { id: 'a1', text: '리포트 상담', done: true },
        { id: 'a2', text: '미완료', done: false, done_at: '2026-08-18T00:00:00Z' },
        { text: 'id 없음' },
      ],
    });
    expect(patch.actions).toHaveLength(2);
    expect(patch.actions?.[0].done_at).toMatch(/^\d{4}-/);
    expect(patch.actions?.[1].done_at).toBeNull();
  });

  it('focus_strategies는 strategy_id·유효 type만 남기고 id를 채운다', () => {
    const patch = buildPlanPatch({
      focus_strategies: [
        { strategy_id: 's-1', strategy_name: '할인', type: 'initial_sales', goal: '결제 3건', memo: ' 왜 ' },
        { strategy_id: 's-2', strategy_name: '잘못된 타입', type: 'nope' },
        { strategy_name: 'id 없음', type: 'retry' },
      ],
    });
    expect(patch.focus_strategies).toHaveLength(1);
    const f = patch.focus_strategies![0];
    expect(f.strategy_id).toBe('s-1');
    expect(f.memo).toBe('왜');
    expect(f.id).toMatch(/[0-9a-f-]{36}/);
    expect(f.carried_from_week).toBeNull();
  });

  it('retrospective의 next_actions는 텍스트 있는 항목만 남긴다', () => {
    const patch = buildPlanPatch({
      retrospective: {
        went_well: 'a',
        went_wrong: 'b',
        next_actions: [{ id: 'n1', text: '리포트 상담 강화' }, { id: 'n2', text: '   ' }],
      },
    });
    expect(patch.retrospective?.next_actions).toHaveLength(1);
    expect(patch.retrospective?.next_actions[0].carried_to).toBeNull();
  });

  it('execution_notes는 텍스트 있는 항목만 남기고 created_at을 채운다', () => {
    const patch = buildPlanPatch({
      execution_notes: [{ id: 'n1', text: '인스타 DM 40건' }, { id: 'n2', text: '' }],
    });
    expect(patch.execution_notes).toHaveLength(1);
    expect(patch.execution_notes?.[0].created_at).toMatch(/^\d{4}-/);
  });
});

describe('normalizePlanRow — 구버전 행 기본값 채우기', () => {
  it('새 컬럼이 없는 행도 빈 값으로 채워 돌려준다', () => {
    const plan = normalizePlanRow({
      id: 'p1',
      segment: 'b2c',
      week_start: '2026-08-17',
      targets: null,
      actions: null,
      created_at: 'x',
      updated_at: 'y',
    });
    expect(plan?.focus_strategies).toEqual([]);
    expect(plan?.execution_notes).toEqual([]);
    expect(plan?.retrospective).toEqual({ went_well: '', went_wrong: '', next_actions: [], updated_at: null });
    expect(plan?.targets).toEqual([]);
  });

  it('null 행은 null', () => {
    expect(normalizePlanRow(null)).toBeNull();
  });
});

describe('buildPlanPatch — tracks 정제', () => {
  const track = (over: Record<string, unknown> = {}) => ({
    id: 't1',
    name: '  신규리드  ',
    goal_text: '  인스타리드 2건 결제  ',
    metric: 'paid',
    target_value: '2',
    achieved: false,
    items: [{ id: 'i1', text: '  첫 세일즈콜 후 상담 포탈 전달  ', done: false }],
    ...over,
  });

  it('이름·목표·항목 텍스트를 트림하고 숫자를 정규화한다', () => {
    const [t] = buildPlanPatch({ tracks: [track()] }).tracks ?? [];
    expect(t).toMatchObject({
      id: 't1',
      name: '신규리드',
      goal_text: '인스타리드 2건 결제',
      metric: 'paid',
      target_value: 2,
      achieved: false,
    });
    expect(t.items[0]).toMatchObject({
      id: 'i1',
      text: '첫 세일즈콜 후 상담 포탈 전달',
      done: false,
      done_at: null,
      strategy_id: null,
      strategy_name: null,
      strategy_type: null,
    });
  });

  it('알 수 없는 지표는 null로 떨어뜨린다', () => {
    const [t] = buildPlanPatch({ tracks: [track({ metric: 'net_revenue' })] }).tracks ?? [];
    expect(t.metric).toBeNull();
  });

  it('음수·비숫자 목표값은 0으로 만든다', () => {
    const [a] = buildPlanPatch({ tracks: [track({ target_value: -5 })] }).tracks ?? [];
    const [b] = buildPlanPatch({ tracks: [track({ target_value: 'abc' })] }).tracks ?? [];
    expect(a.target_value).toBe(0);
    expect(b.target_value).toBe(0);
  });

  it('완료 항목에 done_at을 스탬프한다', () => {
    const [t] = buildPlanPatch({
      tracks: [track({ items: [{ id: 'i1', text: '완료된 일', done: true }] })],
    }).tracks ?? [];
    expect(t.items[0].done_at).toMatch(/^\d{4}-/);
  });

  it('빈 텍스트 항목은 버린다', () => {
    const [t] = buildPlanPatch({
      tracks: [track({ items: [{ id: 'i1', text: '   ' }, { id: 'i2', text: '남는 항목' }] })],
    }).tracks ?? [];
    expect(t.items.map((i) => i.text)).toEqual(['남는 항목']);
  });

  it('전략 스냅샷을 보존하고 잘못된 타입은 버린다', () => {
    const [t] = buildPlanPatch({
      tracks: [
        track({
          items: [
            { id: 'i1', text: 'a', strategy_id: 's-1', strategy_name: '전략A', strategy_type: 'retry' },
            { id: 'i2', text: 'b', strategy_id: 's-2', strategy_name: '전략B', strategy_type: 'nope' },
          ],
        }),
      ],
    }).tracks ?? [];
    expect(t.items[0]).toMatchObject({ strategy_id: 's-1', strategy_name: '전략A', strategy_type: 'retry' });
    expect(t.items[1]).toMatchObject({ strategy_id: 's-2', strategy_type: null });
  });

  it('id가 없으면 만들어 넣는다', () => {
    const [t] = buildPlanPatch({
      tracks: [track({ id: undefined, items: [{ text: 'id 없는 항목' }] })],
    }).tracks ?? [];
    expect(t.id).toHaveLength(36);
    expect(t.items[0].id).toHaveLength(36);
  });

  it('이름과 목표가 모두 비고 항목도 없으면 트랙을 버린다', () => {
    const patch = buildPlanPatch({
      tracks: [track({ name: '  ', goal_text: '', items: [] }), track({ id: 't2' })],
    });
    expect(patch.tracks?.map((t) => t.id)).toEqual(['t2']);
  });

  it('빈 배열도 그대로 패치에 담는다(트랙 전체 삭제)', () => {
    expect(buildPlanPatch({ tracks: [] }).tracks).toEqual([]);
  });

  it('tracks 키가 없으면 패치에 없다', () => {
    expect('tracks' in buildPlanPatch({ actions: [] })).toBe(false);
  });
});

describe('normalizePlanRow — tracks의 NULL vs []', () => {
  const legacyRow = (over: Record<string, unknown> = {}) => ({
    id: 'p1',
    segment: 'b2c',
    week_start: '2026-08-17',
    focus_strategies: [
      {
        id: 'f1',
        strategy_id: 's-report',
        strategy_name: '진단리포트 당일등록 할인',
        type: 'initial_sales',
        goal: '결제 3건',
        memo: '',
        carried_from_week: null,
      },
    ],
    actions: [{ id: 'a1', text: '자동메시지 문구 수정', done: false, done_at: null }],
    created_at: 'x',
    updated_at: 'y',
    ...over,
  });

  it('tracks가 NULL이면 집중 전략·할 일에서 파생한다', () => {
    const plan = normalizePlanRow(legacyRow({ tracks: null }));
    expect(plan?.tracks.map((t) => t.name)).toEqual(['진단리포트 당일등록 할인', '기타']);
    expect(plan?.tracks[0].items[0].strategy_id).toBe('s-report');
  });

  it('tracks 컬럼 자체가 없어도 파생한다(마이그레이션 116 이전 행)', () => {
    const plan = normalizePlanRow(legacyRow());
    expect(plan?.tracks).toHaveLength(2);
  });

  it('tracks가 빈 배열이면 파생하지 않는다(사용자가 비운 상태)', () => {
    const plan = normalizePlanRow(legacyRow({ tracks: [] }));
    expect(plan?.tracks).toEqual([]);
  });

  it('저장된 tracks가 있으면 그대로 정규화한다', () => {
    const plan = normalizePlanRow(
      legacyRow({
        tracks: [
          { id: 't1', name: '신규리드', goal_text: '', metric: 'paid', target_value: 2, items: [{ id: 'i1', text: 'a' }] },
        ],
      }),
    );
    expect(plan?.tracks.map((t) => t.name)).toEqual(['신규리드']);
    expect(plan?.tracks[0].items[0]).toMatchObject({ text: 'a', done: false, strategy_id: null });
  });
});
