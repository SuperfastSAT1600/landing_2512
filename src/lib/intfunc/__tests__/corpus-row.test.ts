import { describe, it, expect } from 'vitest';
import { buildCorpus, type StudentInput, type CallInput } from '../corpus-row';
import { resolveCutoff } from '../select-calls';

const T = (iso: string) => `${iso}.000Z`;

function student(partial: Partial<StudentInput> = {}): StudentInput {
  return {
    id: 's1',
    name: '김민준',
    funnel_stage: '8',
    funnel_stage_updated_at: null,
    stage_history: [{ stage: '8', label: '수업 중', entered_at: T('2026-04-01T00:00:00') }],
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
    recording_name: null, // unknown — 코퍼스에 포함된다
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
    expect(stats.excludedNoTranscript).toBe(1);
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

describe('buildCorpus — REQ-101 확정된 결과만 라벨이 된다', () => {
  it("funnel_stage '8'(결제 완료)은 converted", () => {
    const { rows, stats } = buildCorpus([student({ funnel_stage: '8' })], [call()]);
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

  it("존재하지 않는 단계 '9'는 라벨이 아니다", () => {
    const { rows, stats } = buildCorpus([student({ funnel_stage: '9' })], [call()]);
    expect(rows).toHaveLength(0);
    expect(stats.excludedNoLabel).toBe(1);
  });

  it('진행 중인 단계는 행을 만들지 않는다', () => {
    const { rows, stats } = buildCorpus([student({ funnel_stage: '4' })], [call()]);
    expect(rows).toHaveLength(0);
    expect(stats.excludedNoLabel).toBe(1);
  });
});

describe('buildCorpus — REQ-102 결과 확정 이후 통화 절단', () => {
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
    expect(stats.excludedAllTruncated).toBe(1);
  });

  it('같은 단계가 여러 번이면 가장 늦은 진입을 쓴다', () => {
    const { rows } = buildCorpus(
      [
        student({
          stage_history: [
            { stage: '8', label: '수업 중', entered_at: T('2026-05-01T00:00:00') },
            { stage: '8', label: '수업 중', entered_at: T('2026-04-01T00:00:00') },
          ],
        }),
      ],
      [call({ recorded_at: T('2026-04-15T05:00:00') })]
    );
    expect(rows).toHaveLength(1);
  });

  it('재유입 학생은 현재 라벨의 진입 시각으로 자른다', () => {
    // 2025년에 이탈했다가 재유입해 2026-06 결제. 라벨은 converted이고
    // 그 결과를 만든 것은 재유입 이후의 통화다.
    const { rows } = buildCorpus(
      [
        student({
          funnel_stage: '8',
          stage_history: [
            { stage: 'churned', label: '이탈', entered_at: T('2025-08-01T00:00:00') },
            { stage: '8', label: '수업 중', entered_at: T('2026-06-01T00:00:00') },
          ],
        }),
      ],
      [call({ recorded_at: T('2026-05-01T05:00:00'), transcript: '재유입 세일즈 콜' })]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].transcript).toContain('재유입 세일즈 콜');
  });

  it('결과가 아직 안 난 새 사이클의 통화는 그대로 잘린다', () => {
    // 이탈 후 재상담 중이지만 아직 churned. 그 사이클엔 라벨이 없다.
    const { rows, stats } = buildCorpus(
      [
        student({
          funnel_stage: 'churned',
          stage_history: [
            { stage: 'churned', label: '이탈', entered_at: T('2026-07-13T00:00:00') },
          ],
        }),
      ],
      [call({ recorded_at: T('2026-08-28T05:00:00') })]
    );
    expect(rows).toHaveLength(0);
    expect(stats.excludedAllTruncated).toBe(1);
  });

  it('현재 단계 진입 기록이 없으면 다른 outcome 진입 중 가장 늦은 것을 쓴다', () => {
    expect(
      resolveCutoff(
        student({
          funnel_stage: 'churned',
          stage_history: [{ stage: '8', label: '수업 중', entered_at: T('2026-04-01T00:00:00') }],
        })
      )
    ).toBe(new Date(T('2026-04-01T00:00:00')).getTime());
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

describe('buildCorpus — REQ-103 세일즈 콜만 학습에 넣는다', () => {
  it('재결제·이탈 캠페인·운영 통화는 코퍼스에서 뺀다', () => {
    const { rows, stats } = buildCorpus(
      [student()],
      [
        call({ recording_name: '김민준 어머님_첫 세일즈콜', transcript: '세일즈' }),
        call({
          recording_name: '김민준_재결제',
          transcript: '재결제',
          recorded_at: T('2026-03-03T05:00:00'),
        }),
        call({
          recording_name: '김민준 어머님_이탈 캠페인 콜',
          transcript: '윈백',
          recorded_at: T('2026-03-04T05:00:00'),
        }),
        call({
          recording_name: '김민준_코치변경',
          transcript: '운영',
          recorded_at: T('2026-03-05T05:00:00'),
        }),
      ]
    );
    expect(rows[0].call_count).toBe(1);
    expect(rows[0].transcript).toContain('세일즈');
    expect(rows[0].transcript).not.toContain('재결제');
    expect(rows[0].transcript).not.toContain('윈백');
    expect(rows[0].transcript).not.toContain('운영');
    expect(stats.callsFiltered).toBe(3);
    expect(stats.callsByKind.renewal).toBe(1);
    expect(stats.callsByKind.winback).toBe(1);
    expect(stats.callsByKind.ops).toBe(1);
  });

  it('이름 없는 통화(unknown)는 코퍼스에 남긴다', () => {
    const { rows, stats } = buildCorpus([student()], [call({ recording_name: null })]);
    expect(rows).toHaveLength(1);
    expect(stats.callsByKind.unknown).toBe(1);
  });

  it('통화가 전부 유형 제외되면 행이 만들어지지 않는다', () => {
    const { rows, stats } = buildCorpus(
      [student()],
      [
        call({ recording_name: '김민준_재결제' }),
        call({ recording_name: '김민준_환불상담', recorded_at: T('2026-03-03T05:00:00') }),
      ]
    );
    expect(rows).toHaveLength(0);
    expect(stats.excludedAllFiltered).toBe(1);
    expect(stats.excludedAllTruncated).toBe(0);
  });
});

describe('buildCorpus — REQ-104 같은 녹음 중복 제거', () => {
  it('같은 학생의 같은 시각·같은 길이 통화는 하나로 센다', () => {
    const { rows, stats } = buildCorpus(
      [student()],
      [
        call({ recorded_at: T('2026-03-02T05:30:00'), duration_sec: 437 }),
        call({ recorded_at: T('2026-03-02T05:30:00'), duration_sec: 437 }),
      ]
    );
    expect(rows[0].call_count).toBe(1);
    expect(rows[0].total_duration_sec).toBe(437);
    expect(stats.duplicateCalls).toBe(1);
  });

  it('다른 학생의 같은 시각 통화는 접지 않는다 — 자매 케이스', () => {
    const { rows, stats } = buildCorpus(
      [student({ id: 'a', name: '엄채영' }), student({ id: 'b', name: '엄채윤' })],
      [
        call({ student_id: 'a', recorded_at: T('2026-03-02T05:30:00'), duration_sec: 91 }),
        call({ student_id: 'b', recorded_at: T('2026-03-02T05:30:00'), duration_sec: 91 }),
      ]
    );
    expect(rows).toHaveLength(2);
    expect(stats.duplicateCalls).toBe(0);
  });

  it('recorded_at이 없으면 동일 녹음인지 판단하지 않는다', () => {
    const { rows, stats } = buildCorpus(
      [student()],
      [
        call({ recorded_at: null, created_at: T('2026-03-02T05:00:00'), duration_sec: 100 }),
        call({ recorded_at: null, created_at: T('2026-03-02T05:00:00'), duration_sec: 100 }),
      ]
    );
    expect(rows[0].call_count).toBe(2);
    expect(stats.duplicateCalls).toBe(0);
  });
});

describe('buildCorpus — REQ-105 제외 사유를 구분해 보고한다', () => {
  it('세 가지 제외 사유가 서로 겹치지 않는다', () => {
    const { rows, stats } = buildCorpus(
      [
        student({ id: 'none' }), // 전사 없음
        student({ id: 'filtered' }), // 전부 유형 제외
        student({ id: 'truncated' }), // 전부 절단
        student({ id: 'ok' }), // 정상
        student({ id: 'nolabel', funnel_stage: '4' }), // 라벨 없음
      ],
      [
        call({ student_id: 'filtered', recording_name: '김민준_재결제' }),
        call({ student_id: 'truncated', recorded_at: T('2026-04-05T05:00:00') }),
        call({ student_id: 'ok' }),
        call({ student_id: 'nolabel' }),
      ]
    );
    expect(stats.excludedNoTranscript).toBe(1);
    expect(stats.excludedAllFiltered).toBe(1);
    expect(stats.excludedAllTruncated).toBe(1);
    expect(stats.excludedNoLabel).toBe(1);
    expect(rows).toHaveLength(1);
    expect(
      rows.length +
        stats.excludedNoLabel +
        stats.excludedNoTranscript +
        stats.excludedAllFiltered +
        stats.excludedAllTruncated
    ).toBe(stats.students);
  });

  it('통화 단위 집계가 서로 맞는다', () => {
    const { stats } = buildCorpus(
      [student()],
      [
        call({ transcript: '유지' }),
        call({ recorded_at: T('2026-03-02T05:30:00'), duration_sec: 437 }),
        call({ recorded_at: T('2026-03-02T05:30:00'), duration_sec: 437 }), // 중복
        call({ recording_name: '김민준_재결제', recorded_at: T('2026-03-03T05:00:00') }), // 유형
        call({ recorded_at: T('2026-04-05T05:00:00') }), // 절단
      ]
    );
    expect(stats.callsTotal).toBe(5);
    expect(stats.duplicateCalls).toBe(1);
    expect(stats.callsFiltered).toBe(1);
    expect(stats.callsTruncated).toBe(1);
    expect(stats.callsKept).toBe(2);
    expect(
      stats.duplicateCalls + stats.callsFiltered + stats.callsTruncated + stats.callsKept
    ).toBe(stats.callsTotal);
  });
});
