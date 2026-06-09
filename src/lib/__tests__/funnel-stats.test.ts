import { describe, it, expect } from 'vitest';
import { computeStageFlow, hasReachedStage, type StageFlowInput } from '../funnel-stats';

// 기준 시각 (테스트용 고정 ISO)
const T0 = '2026-01-01T00:00:00.000Z';
const addDays = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();

function student(partial: Partial<StageFlowInput>): StageFlowInput {
  return {
    funnel_stage: '0',
    funnel_stage_updated_at: null,
    created_at: T0,
    stage_history: [],
    ...partial,
  };
}

describe('computeStageFlow — REQ-001 도달·이동 비율', () => {
  it('현재 단계 기준으로 0..현재까지 모두 reached로 집계한다', () => {
    const rows = computeStageFlow([student({ funnel_stage: '7' })]);
    const byStage = Object.fromEntries(rows.map((r) => [r.stage, r]));
    // 0~7 모두 도달
    for (const s of ['0', '1', '2', '3a', '3b', '4', '5a', '5b', '6', '7']) {
      expect(byStage[s].reached).toBe(1);
    }
    // 8은 미도달
    expect(byStage['8'].reached).toBe(0);
  });

  it('reached는 단계 순서대로 단조 감소한다 (퍼널 보장)', () => {
    const students = [
      student({ funnel_stage: '1' }),
      student({ funnel_stage: '4' }),
      student({ funnel_stage: '8' }),
    ];
    const rows = computeStageFlow(students);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].reached).toBeLessThanOrEqual(rows[i - 1].reached);
    }
  });

  it('advance_rate = 다음 단계 이상 도달 / 현재 단계 도달', () => {
    // 2명 단계1 도달, 그중 1명만 단계4까지
    const rows = computeStageFlow([
      student({ funnel_stage: '1' }),
      student({ funnel_stage: '4' }),
    ]);
    const stage1 = rows.find((r) => r.stage === '1')!;
    expect(stage1.reached).toBe(2);
    expect(stage1.advanced).toBe(1);
    expect(stage1.advance_rate).toBe(50);
  });

  it('churned 학생은 도달 집계에서 제외한다', () => {
    const rows = computeStageFlow([
      student({ funnel_stage: 'churned', stage_history: [] }),
    ]);
    expect(rows.every((r) => r.reached === 0)).toBe(true);
  });

  it('stage_history가 현재 단계보다 더 진전된 단계를 포함하면 그것도 반영한다', () => {
    // 현재는 4지만 과거 7까지 갔던 이력
    const rows = computeStageFlow([
      student({
        funnel_stage: '4',
        stage_history: [
          { stage: '4', label: '', entered_at: T0 },
          { stage: '7', label: '', entered_at: addDays(T0, 1) },
        ],
      }),
    ]);
    expect(rows.find((r) => r.stage === '7')!.reached).toBe(1);
  });
});

describe('computeStageFlow — REQ-002 체류 기간', () => {
  it('연속 전환 시간차를 앞 단계 체류 기간으로 집계한다', () => {
    const rows = computeStageFlow([
      student({
        funnel_stage: '4',
        stage_history: [
          { stage: '0', label: '', entered_at: T0 },
          { stage: '1', label: '', entered_at: addDays(T0, 2) },
          { stage: '4', label: '', entered_at: addDays(T0, 5) },
        ],
      }),
    ]);
    expect(rows.find((r) => r.stage === '0')!.avg_days).toBe(2);
    expect(rows.find((r) => r.stage === '1')!.avg_days).toBe(3);
    // 마지막 단계(4)는 후속 엔트리 없음 → 표본 없음
    expect(rows.find((r) => r.stage === '4')!.sample_size).toBe(0);
  });

  it('평균과 중앙값을 모두 계산한다', () => {
    const mk = (days: number[]) => {
      let acc = T0;
      const hist = [{ stage: '0', label: '', entered_at: acc }];
      // 단계 0에서 days 만큼 머문 뒤 1로 이동
      acc = addDays(acc, days[0]);
      hist.push({ stage: '1', label: '', entered_at: acc });
      return student({ funnel_stage: '1', stage_history: hist });
    };
    // 단계0 체류: 2일, 4일, 9일 → avg=5, median=4
    const rows = computeStageFlow([mk([2]), mk([4]), mk([9])]);
    const stage0 = rows.find((r) => r.stage === '0')!;
    expect(stage0.sample_size).toBe(3);
    expect(stage0.avg_days).toBe(5);
    expect(stage0.median_days).toBe(4);
  });

  it('이력이 없으면 체류 기간 표본은 0이고 avg/median은 null', () => {
    const rows = computeStageFlow([student({ funnel_stage: '3a', stage_history: [] })]);
    const stage0 = rows.find((r) => r.stage === '0')!;
    expect(stage0.sample_size).toBe(0);
    expect(stage0.avg_days).toBeNull();
    expect(stage0.median_days).toBeNull();
  });

  it('정렬되지 않은 stage_history도 entered_at 순으로 정렬해 계산한다', () => {
    const rows = computeStageFlow([
      student({
        funnel_stage: '1',
        stage_history: [
          { stage: '1', label: '', entered_at: addDays(T0, 2) },
          { stage: '0', label: '', entered_at: T0 },
        ],
      }),
    ]);
    expect(rows.find((r) => r.stage === '0')!.avg_days).toBe(2);
  });
});

describe('hasReachedStage — REQ-005 컨택 성공 정의', () => {
  it('현재 단계가 목표 이상이면 true', () => {
    expect(hasReachedStage({ funnel_stage: '4', stage_history: [] }, '2')).toBe(true);
    expect(hasReachedStage({ funnel_stage: '2', stage_history: [] }, '2')).toBe(true);
  });

  it('현재 단계가 목표 미만이면 false', () => {
    expect(hasReachedStage({ funnel_stage: '1', stage_history: [] }, '2')).toBe(false);
    expect(hasReachedStage({ funnel_stage: '0', stage_history: [] }, '2')).toBe(false);
  });

  it('이력만으로도 도달 판정 (현재는 churned여도 과거 2단계 이상이면 true)', () => {
    expect(
      hasReachedStage(
        {
          funnel_stage: 'churned',
          stage_history: [
            { stage: '0', label: '', entered_at: T0 },
            { stage: '4', label: '', entered_at: addDays(T0, 1) },
          ],
        },
        '2'
      )
    ).toBe(true);
  });

  it('이력 없이 churned이면 컨택 성공 아님 (보수적 폴백)', () => {
    expect(hasReachedStage({ funnel_stage: 'churned', stage_history: [] }, '2')).toBe(false);
  });

  it('첫 메시지만 보내고 이탈한 리드는 컨택 성공 아님', () => {
    expect(
      hasReachedStage(
        {
          funnel_stage: 'churned',
          stage_history: [
            { stage: '0', label: '', entered_at: T0 },
            { stage: '1', label: '', entered_at: addDays(T0, 1) },
          ],
        },
        '2'
      )
    ).toBe(false);
  });
});

describe('computeStageFlow — REQ-003 출력 구조', () => {
  it('퍼널 순서대로 모든 단계 행을 반환한다 (churned 제외)', () => {
    const rows = computeStageFlow([]);
    expect(rows.map((r) => r.stage)).toEqual([
      '0', '1', '2', '3a', '3b', '4', '5a', '5b', '6', '7', '8',
    ]);
    // 빈 입력 시 모두 0
    expect(rows.every((r) => r.reached === 0 && r.advance_rate === 0)).toBe(true);
  });

  it('각 행은 label을 포함한다', () => {
    const rows = computeStageFlow([student({ funnel_stage: '0' })]);
    expect(rows.find((r) => r.stage === '0')!.label).toBe('리드 인입');
  });
});
