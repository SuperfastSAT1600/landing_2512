import { describe, it, expect } from 'vitest';
import {
  classifyInternal,
  isUnscoredLegacy,
  normalizeFirebaseNode,
  normalizeLegacyJson,
  mergeAttempts,
  toUpsertRow,
} from '../legacy-diagnostic-normalize';

describe('classifyInternal (REQ-002)', () => {
  it('실제 학생 이름은 내부 테스트로 보지 않는다', () => {
    for (const name of ['김지인', '김재연', '김남준', 'Ryan', '김연준/Roy Kim']) {
      expect(classifyInternal(name).isInternal, name).toBe(false);
    }
  });

  it('테스트 키워드가 든 이름을 걸러낸다', () => {
    expect(classifyInternal('만점 테스트')).toEqual({ isInternal: true, reason: 'test-keyword' });
    expect(classifyInternal('테스트 9900').isInternal).toBe(true);
    expect(classifyInternal('Test Student').isInternal).toBe(true);
  });

  it('이름 뒤 숫자 접미사는 사내 반복 제출로 본다', () => {
    expect(classifyInternal('배병윤99')).toEqual({ isInternal: true, reason: 'digit-suffix' });
    expect(classifyInternal('이민재0704').isInternal).toBe(true);
    expect(classifyInternal('김지인0707').isInternal).toBe(true);
  });

  it('자모 난타·한 글자·구두점 이름을 걸러낸다', () => {
    expect(classifyInternal('ㄴㅁㅎㅁㄴㅇㅎㅁㄴㅇㅎ').reason).toBe('jamo-noise');
    expect(classifyInternal('s').reason).toBe('too-short');
    expect(classifyInternal('d으아악!').reason).toBe('punctuation-noise');
    expect(classifyInternal('   ').reason).toBe('empty-name');
  });
});

describe('normalizeFirebaseNode (REQ-001)', () => {
  it('RTDB 노드를 레코드 배열로 펴고 키를 보존한다', () => {
    const attempts = normalizeFirebaseNode({
      '-Nabc': {
        originalId: 'uuid-1',
        code: 'ABC123',
        studentName: '김지인',
        studentGrade: 'US11',
        score: 1108,
        rwScore: 560,
        mathScore: 548,
        createdAt: '2025-07-05T01:00:00.000Z',
        answers: { '1': 'A' },
        confidence: { '1': 'high' },
      },
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      source: 'firebase',
      firebase_key: '-Nabc',
      original_id: 'uuid-1',
      student_name: '김지인',
      student_grade: 'US11',
      score: 1108,
      rw_score: 560,
      math_score: 548,
      taken_at: '2025-07-05T01:00:00.000Z',
      is_internal: false,
    });
  });

  it('노드가 비어 있거나 null이면 빈 배열', () => {
    expect(normalizeFirebaseNode(null)).toEqual([]);
    expect(normalizeFirebaseNode({})).toEqual([]);
  });

  it('이름이 없는 레코드도 버리지 않고 빈 이름 + 내부 플래그로 남긴다', () => {
    const [a] = normalizeFirebaseNode({ k1: { score: 400 } });
    expect(a.student_name).toBe('');
    expect(a.is_internal).toBe(true);
    expect(a.internal_reason).toBe('empty-name');
  });
});

describe('normalizeLegacyJson (REQ-001)', () => {
  it('database.json 행의 id를 original_id로 옮긴다', () => {
    const [a] = normalizeLegacyJson([
      {
        id: 'uuid-1',
        studentName: '김재연',
        studentGrade: 'US12',
        score: 848,
        createdAt: '2025-07-09T00:00:00.000Z',
      },
    ]);
    expect(a.source).toBe('database_json');
    expect(a.original_id).toBe('uuid-1');
    expect(a.firebase_key).toBeNull();
  });
});

describe('mergeAttempts (REQ-001)', () => {
  const fb = normalizeFirebaseNode({
    '-Nabc': { originalId: 'uuid-1', studentName: '김지인', createdAt: '2025-07-05T01:00:00.000Z' },
  });

  it('Firebase가 originalId로 품고 있는 database.json 행은 중복으로 버린다', () => {
    const json = normalizeLegacyJson([
      { id: 'uuid-1', studentName: '김지인', createdAt: '2025-07-05T01:00:00.000Z' },
      { id: 'uuid-2', studentName: '김재연', createdAt: '2025-07-09T00:00:00.000Z' },
    ]);
    const { attempts, droppedDuplicates } = mergeAttempts(fb, json);
    expect(droppedDuplicates).toBe(1);
    expect(attempts).toHaveLength(2);
    expect(attempts.filter((a) => a.original_id === 'uuid-1')).toHaveLength(1);
    expect(attempts.find((a) => a.original_id === 'uuid-1')!.source).toBe('firebase');
  });

  it('Firebase를 못 읽었으면 database.json만으로 성립한다', () => {
    const json = normalizeLegacyJson([
      { id: 'uuid-9', studentName: '김남준', createdAt: '2025-07-10T00:00:00.000Z' },
    ]);
    const { attempts, droppedDuplicates } = mergeAttempts([], json);
    expect(attempts).toHaveLength(1);
    expect(droppedDuplicates).toBe(0);
  });
});

describe('toUpsertRow (REQ-004)', () => {
  const [attempt] = normalizeFirebaseNode({
    '-Nabc': { originalId: 'uuid-1', studentName: '김지인', createdAt: '2025-07-05T01:00:00.000Z' },
  });

  it('매칭 컬럼은 페이로드에 넣지 않는다 — 재적재가 수검토 결과를 지우면 안 된다', () => {
    const row = toUpsertRow(attempt);
    expect(row).not.toHaveProperty('student_id');
    expect(row).not.toHaveProperty('match_method');
    expect(row).not.toHaveProperty('match_confidence');
    expect(row).not.toHaveProperty('match_note');
  });

  it('DB 컬럼명으로 매핑하고 updated_at을 채운다', () => {
    const row = toUpsertRow(attempt);
    expect(row.firebase_key).toBe('-Nabc');
    expect(row.student_name).toBe('김지인');
    expect(typeof row.updated_at).toBe('string');
  });
});

describe('isUnscoredLegacy — 채점이 저장되지 않은 응시', () => {
  it('SAT 최저점 고정값(400 = RW200 + Math200)은 실제 점수가 아니다', () => {
    // 2025-07-17 이후 Firebase 저장분 105건이 전부 이 값이다(답안 매핑 버그).
    expect(isUnscoredLegacy({ score: 400, rw_score: 200, math_score: 200 })).toBe(true);
  });

  it('정상 점수는 그대로 쓴다', () => {
    expect(isUnscoredLegacy({ score: 1108, rw_score: 514, math_score: 594 })).toBe(false);
    expect(isUnscoredLegacy({ score: 848, rw_score: 430, math_score: 418 })).toBe(false);
  });

  it('400점이라도 섹션 점수가 최저값이 아니면 실제 점수로 본다', () => {
    expect(isUnscoredLegacy({ score: 400, rw_score: 250, math_score: 150 })).toBe(false);
  });

  it('점수 자체가 없으면 사용 불가로 본다', () => {
    expect(isUnscoredLegacy({ score: null, rw_score: null, math_score: null })).toBe(true);
  });
});
