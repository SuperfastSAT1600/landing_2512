// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parquetWriteFile } from 'hyparquet-writer';
import { parquetReadObjects, asyncBufferFromFile } from 'hyparquet';
import { buildCorpus } from '@/lib/intfunc/corpus-row';
import { toColumnData } from '@/lib/intfunc/parquet';

describe('내보내기 파이프라인 — 스크립트가 실제로 밟는 경로', () => {
  it('전사 → 코퍼스 → parquet 파일 → 재독', async () => {
    const students = [
      {
        id: 'a',
        name: '김민준',
        funnel_stage: '8',
        funnel_stage_updated_at: null,
        stage_history: [{ stage: '8', label: '수업 중', entered_at: '2026-04-01T00:00:00.000Z' }],
        grade: '11',
        school_type: 'international',
        desired_subjects: 'Both',
        target_score: 1500,
        previous_rw_score: 600,
        previous_math_score: null,
      },
      {
        id: 'b',
        name: '이서연',
        funnel_stage: 'churned',
        funnel_stage_updated_at: '2026-03-20T00:00:00.000Z',
        stage_history: [],
        grade: '12',
        school_type: 'korean_special',
        desired_subjects: 'RW',
        target_score: null,
        previous_rw_score: null,
        previous_math_score: null,
      },
    ];
    const calls = [
      {
        student_id: 'a',
        source: 'plaud' as const,
        recording_name: '첫 세일즈콜',
        recorded_at: '2026-03-02T05:05:00.000Z',
        created_at: '2026-03-02T05:05:00.000Z',
        duration_sec: 1080,
        transcript: '상담사: 김민준 학생 어머니시죠? 010-1234-5678 맞으신가요',
      },
      {
        student_id: 'a',
        source: 'voip' as const,
        recording_name: 'Report 세일즈콜',
        recorded_at: '2026-03-09T11:30:00.000Z',
        created_at: '2026-03-09T11:30:00.000Z',
        duration_sec: 2040,
        transcript: '고객: 등록할게요',
      },
      {
        student_id: 'a',
        source: 'voip' as const,
        recording_name: 'Report 세일즈콜',
        recorded_at: '2026-05-01T00:00:00.000Z',
        created_at: '2026-05-01T00:00:00.000Z',
        duration_sec: 60,
        transcript: '결제 완료 후 통화',
      },
      {
        student_id: 'b',
        source: 'plaud' as const,
        recording_name: '첫 세일즈콜',
        recorded_at: '2026-03-01T00:00:00.000Z',
        created_at: '2026-03-01T00:00:00.000Z',
        duration_sec: 300,
        transcript: '이서연 학생 고민중입니다',
      },
    ];

    const { rows, stats } = buildCorpus(students, calls);
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ifx-')), 'sales-calls.parquet');
    parquetWriteFile({ filename: file, columnData: toColumnData(rows) });

    const read = await parquetReadObjects({ file: await asyncBufferFromFile(file) });

    expect(read).toHaveLength(2);
    const a = read.find((r) => r.student_id === 'a')!;
    expect(a.outcome).toBe('converted');
    expect(a.call_count).toBe(2); // 결제 이후 통화는 잘렸다
    expect(a.transcript).not.toContain('결제 완료 후 통화');
    expect(a.transcript).not.toContain('010-1234-5678');
    expect(a.transcript).not.toContain('김민준');
    expect(a.previous_math_score).toBeNull();
    expect(read.find((r) => r.student_id === 'b')!.outcome).toBe('lost');
    expect(stats.cutoffUnavailable).toBe(0);
  });
});
