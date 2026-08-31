import { describe, it, expect } from 'vitest';
import { buildCorpus, type StudentInput, type CallInput } from '../corpus-row';

const T = (iso: string) => `${iso}.000Z`;

function student(partial: Partial<StudentInput> = {}): StudentInput {
  return {
    id: 's1',
    name: '김민준',
    funnel_stage: '9',
    funnel_stage_updated_at: null,
    stage_history: [{ stage: '9', label: '결제 완료', entered_at: T('2026-04-01T00:00:00') }],
    grade: '11',
    school_type: 'international',
    desired_subjects: 'Both',
    target_score: 1500,
    previous_rw_score: 600,
    previous_math_score: 700,
    ...partial,
  };
}

function call(partial: Partial<CallInput> = {}): CallInput {
  return {
    student_id: 's1',
    source: 'plaud',
    recorded_at: T('2026-03-02T05:05:00'), // 14:05 KST
    created_at: T('2026-03-02T05:05:00'),
    duration_sec: 1080, // 18분
    transcript: '상담사: 안녕하세요',
    ...partial,
  };
}

describe('buildCorpus — REQ-001 학생 단위 병합', () => {
  it('학생별로 행 하나를 만들고 통화 수를 센다', () => {
    const { rows } = buildCorpus(
      [student({ id: 'a' }), student({ id: 'b' })],
      [
        call({ student_id: 'a' }),
        call({ student_id: 'a', recorded_at: T('2026-03-09T05:00:00') }),
        call({ student_id: 'b' }),
      ]
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.student_id === 'a')?.call_count).toBe(2);
    expect(rows.find((r) => r.student_id === 'b')?.call_count).toBe(1);
  });

  it('통화를 시각 오름차순으로 정렬한다', () => {
    const { rows } = buildCorpus(
      [student()],
      [
        call({ recorded_at: T('2026-03-09T05:00:00'), transcript: '두번째' }),
        call({ recorded_at: T('2026-03-02T05:00:00'), transcript: '첫번째' }),
      ]
    );
    expect(rows[0].transcript.indexOf('첫번째')).toBeLessThan(rows[0].transcript.indexOf('두번째'));
  });

  it('recorded_at이 없으면 created_at으로 정렬한다', () => {
    const { rows } = buildCorpus(
      [student()],
      [
        call({ recorded_at: null, created_at: T('2026-03-09T05:00:00'), transcript: '나중' }),
        call({ recorded_at: null, created_at: T('2026-03-02T05:00:00'), transcript: '먼저' }),
      ]
    );
    expect(rows[0].transcript.indexOf('먼저')).toBeLessThan(rows[0].transcript.indexOf('나중'));
  });

  it('통화가 없는 학생은 행을 만들지 않는다', () => {
    const { rows, stats } = buildCorpus([student()], []);
    expect(rows).toHaveLength(0);
    expect(stats.excludedNoCalls).toBe(1);
  });

  it('통화 길이를 합산한다', () => {
    const { rows } = buildCorpus(
      [student()],
      [
        call({ duration_sec: 600 }),
        call({ duration_sec: 300, recorded_at: T('2026-03-09T05:00:00') }),
      ]
    );
    expect(rows[0].total_duration_sec).toBe(900);
  });
});

describe('buildCorpus — REQ-002 통화 구분자', () => {
  it('통화마다 번호가 붙은 헤더를 넣는다', () => {
    const { rows } = buildCorpus(
      [student()],
      [call(), call({ recorded_at: T('2026-03-09T11:30:00'), duration_sec: 2040, source: 'voip' })]
    );
    expect(rows[0].transcript).toContain('=== 통화 1 · 2026-03-02 14:05 KST · 18분 · plaud ===');
    expect(rows[0].transcript).toContain('=== 통화 2 · 2026-03-09 20:30 KST · 34분 · voip ===');
    expect(rows[0].transcript.match(/=== 통화 /g)).toHaveLength(2);
  });

  it('메타데이터가 없어도 번호와 소스는 남는다', () => {
    const { rows } = buildCorpus(
      [student()],
      [
        call({
          recorded_at: null,
          created_at: T('2026-03-02T05:00:00'),
          duration_sec: null,
          source: 'voip',
        }),
      ]
    );
    expect(rows[0].transcript).toContain('=== 통화 1 · 2026-03-02 14:00 KST · voip ===');
  });

  it('전사 본문은 비식별된 상태로 들어간다', () => {
    const { rows, stats } = buildCorpus(
      [student()],
      [call({ transcript: '상담사: 김민준 학생 어머니 연락처가 010-1234-5678 맞으실까요' })]
    );
    expect(rows[0].transcript).not.toContain('김민준');
    expect(rows[0].transcript).not.toContain('010-1234-5678');
    expect(stats.redactions).toBeGreaterThan(0);
  });
});

describe('buildCorpus — REQ-003 확정된 결과만 라벨이 된다', () => {
  it("funnel_stage '9'는 converted", () => {
    const { rows, stats } = buildCorpus([student({ funnel_stage: '9' })], [call()]);
    expect(rows[0].outcome).toBe('converted');
    expect(stats.converted).toBe(1);
  });

  it("funnel_stage 'churned'는 lost", () => {
    const { rows, stats } = buildCorpus(
      [
        student({
          funnel_stage: 'churned',
          stage_history: [
            { stage: 'churned', label: '이탈', entered_at: T('2026-04-01T00:00:00') },
          ],
        }),
      ],
      [call()]
    );
    expect(rows[0].outcome).toBe('lost');
    expect(stats.lost).toBe(1);
  });

  it('진행 중인 단계는 행을 만들지 않는다', () => {
    const { rows, stats } = buildCorpus([student({ funnel_stage: '4' })], [call()]);
    expect(rows).toHaveLength(0);
    expect(stats.excludedNoLabel).toBe(1);
  });
});

describe('buildCorpus — REQ-004 결과 확정 이후 통화 절단', () => {
  it('확정 시각 이후의 통화를 제외한다', () => {
    const { rows } = buildCorpus(
      [student()], // 확정: 2026-04-01
      [
        call({ transcript: '확정 전' }),
        call({ recorded_at: T('2026-04-05T05:00:00'), transcript: '확정 후' }),
      ]
    );
    expect(rows[0].call_count).toBe(1);
    expect(rows[0].transcript).toContain('확정 전');
    expect(rows[0].transcript).not.toContain('확정 후');
  });

  it('확정 이후 통화만 있으면 행이 만들어지지 않는다', () => {
    const { rows, stats } = buildCorpus(
      [student()],
      [call({ recorded_at: T('2026-04-05T05:00:00') })]
    );
    expect(rows).toHaveLength(0);
    expect(stats.excludedNoCalls).toBe(1);
  });

  it('같은 단계가 여러 번이면 가장 이른 진입을 쓴다', () => {
    const { rows } = buildCorpus(
      [
        student({
          stage_history: [
            { stage: '9', label: '결제 완료', entered_at: T('2026-05-01T00:00:00') },
            { stage: '9', label: '결제 완료', entered_at: T('2026-04-01T00:00:00') },
          ],
        }),
      ],
      [call({ recorded_at: T('2026-04-15T05:00:00') })]
    );
    expect(rows).toHaveLength(0);
  });

  it('stage_history에 없으면 funnel_stage_updated_at으로 절단한다', () => {
    const { rows, stats } = buildCorpus(
      [student({ stage_history: [], funnel_stage_updated_at: T('2026-04-01T00:00:00') })],
      [call({ recorded_at: T('2026-04-05T05:00:00') })]
    );
    expect(rows).toHaveLength(0);
    expect(stats.cutoffUnavailable).toBe(0);
  });

  it('절단 근거가 아예 없으면 자르지 않되 그 사실을 보고한다', () => {
    const { rows, stats } = buildCorpus(
      [student({ stage_history: [], funnel_stage_updated_at: null })],
      [call({ recorded_at: T('2026-04-05T05:00:00') })]
    );
    expect(rows).toHaveLength(1);
    expect(stats.cutoffUnavailable).toBe(1);
  });
});
