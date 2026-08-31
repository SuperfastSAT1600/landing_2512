// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { parquetWriteBuffer } from 'hyparquet-writer';
import { parquetReadObjects } from 'hyparquet';
import { toColumnData, CORPUS_COLUMNS } from '../parquet';
import type { CorpusRow } from '../corpus-row';

function row(partial: Partial<CorpusRow> = {}): CorpusRow {
  return {
    student_id: 's1',
    transcript: '=== 통화 1 · 2026-03-02 14:05 KST · 18분 · plaud ===\n상담사: 안녕하세요',
    outcome: 'converted',
    grade: '11',
    school_type: 'international',
    desired_subjects: 'Both',
    target_score: 1500,
    previous_rw_score: 600,
    previous_math_score: 700,
    call_count: 2,
    total_duration_sec: 1380,
    ...partial,
  };
}

describe('parquet — REQ-006 코퍼스 행 직렬화', () => {
  it('쓴 행을 그대로 다시 읽는다 (왕복)', async () => {
    const rows = [row(), row({ student_id: 's2', outcome: 'lost', call_count: 1 })];
    const buffer = parquetWriteBuffer({ columnData: toColumnData(rows) });
    const read = (await parquetReadObjects({ file: buffer })) as unknown as CorpusRow[];

    expect(read).toHaveLength(2);
    expect(read[0].student_id).toBe('s1');
    expect(read[0].transcript).toBe(rows[0].transcript);
    expect(read[0].outcome).toBe('converted');
    expect(read[0].call_count).toBe(2);
    expect(read[1].outcome).toBe('lost');
  });

  it('null 숫자 컬럼을 null로 보존한다', async () => {
    const rows = [row({ target_score: null, previous_rw_score: null, grade: null })];
    const buffer = parquetWriteBuffer({ columnData: toColumnData(rows) });
    const read = (await parquetReadObjects({ file: buffer })) as unknown as CorpusRow[];

    expect(read[0].target_score).toBeNull();
    expect(read[0].previous_rw_score).toBeNull();
    expect(read[0].grade).toBeNull();
    expect(read[0].previous_math_score).toBe(700);
  });

  it('선언한 컬럼과 실제로 쓰는 컬럼이 어긋나지 않는다', () => {
    const written = toColumnData([row()]).map((c) => c.name);
    expect(written).toEqual(CORPUS_COLUMNS.map((c) => c.name));
  });

  it('행이 없어도 컬럼 구조는 유지한다', () => {
    const columns = toColumnData([]);
    expect(columns.map((c) => c.name)).toEqual(CORPUS_COLUMNS.map((c) => c.name));
    expect(columns.every((c) => c.data.length === 0)).toBe(true);
  });
});
