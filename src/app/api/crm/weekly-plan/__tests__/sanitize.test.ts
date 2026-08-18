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
