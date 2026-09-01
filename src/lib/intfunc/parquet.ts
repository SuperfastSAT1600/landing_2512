/**
 * 코퍼스 행 → Parquet, 그리고 같은 정의에서 나오는 external dataset 스키마 선언 (REQ-006).
 *
 * 컬럼 정의가 여기 한 곳에만 있는 것이 요점이다. intfunc에 선언하는 스키마와 실제로
 * 쓰는 Parquet 컬럼이 따로 적히면 언젠가 어긋나고, 그 어긋남은 업로드를 마치고 트레이너가
 * 파일을 읽는 시점에야 드러난다. 하나의 배열에서 둘 다 파생시켜 그 경우를 없앤다.
 */
import type { ExternalColumnType, ExternalSchemaInput } from '@intfunc/sdk';
import type { ColumnSource, BasicType } from 'hyparquet-writer/src/types.js';
import type { CorpusRow } from './corpus-row';

interface CorpusColumn {
  name: keyof CorpusRow;
  /** intfunc 선언용. `ExternalColumnType`은 text|number|boolean|struct|list. */
  intfunc: ExternalColumnType;
  /** Parquet 물리 타입. */
  parquet: BasicType;
  nullable: boolean;
}

/** 평면 컬럼만 쓴다 — struct를 피하면 선언도 Parquet 쓰기도 단순해진다. */
export const CORPUS_COLUMNS: readonly CorpusColumn[] = [
  { name: 'student_id', intfunc: 'text', parquet: 'STRING', nullable: false },
  { name: 'transcript', intfunc: 'text', parquet: 'STRING', nullable: false },
  { name: 'outcome', intfunc: 'text', parquet: 'STRING', nullable: false },
  { name: 'grade', intfunc: 'text', parquet: 'STRING', nullable: true },
  { name: 'school_type', intfunc: 'text', parquet: 'STRING', nullable: true },
  { name: 'desired_subjects', intfunc: 'text', parquet: 'STRING', nullable: true },
  { name: 'target_score', intfunc: 'number', parquet: 'INT32', nullable: true },
  { name: 'previous_rw_score', intfunc: 'number', parquet: 'INT32', nullable: true },
  { name: 'previous_math_score', intfunc: 'number', parquet: 'INT32', nullable: true },
  { name: 'call_count', intfunc: 'number', parquet: 'INT32', nullable: false },
  { name: 'total_duration_sec', intfunc: 'number', parquet: 'INT32', nullable: false },
];

/** pack의 corpus가 가리키는 경로. 컬럼 이름이 바뀌면 여기도 같이 바뀐다. */
export const CORPUS_TEXT_COLUMN = 'transcript';
export const CORPUS_LABEL_COLUMN = 'outcome';

/** intfunc에 선언할 스키마. `create`/`declare` 양쪽이 같은 값을 쓴다. */
export function externalSchema(): ExternalSchemaInput {
  return {
    columns: CORPUS_COLUMNS.map(({ name, intfunc, nullable }) => ({
      name,
      type: intfunc,
      nullable,
    })),
    inputFormat: 'parquet',
  };
}

/** 행을 컬럼으로 전치한다. 컬럼 순서는 `CORPUS_COLUMNS` 그대로다. */
export function toColumnData(rows: readonly CorpusRow[]): ColumnSource[] {
  return CORPUS_COLUMNS.map(({ name, parquet, nullable }) => ({
    name,
    data: rows.map((row) => row[name] ?? null),
    type: parquet,
    nullable,
  }));
}
