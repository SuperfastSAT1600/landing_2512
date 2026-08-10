/**
 * 데모 콘텐츠 정합성 검사.
 *
 * 이 데모의 설득력은 화면끼리 말이 맞는다는 데서 나온다. 학년이 어긋나거나 점수가 다르면
 * 국제학교 대표님이 바로 알아챈다. 사람 눈으로만 확인하면 반드시 새므로 테스트로 고정한다.
 */
import { describe, it, expect } from 'vitest';
import { DEMO_NOTES } from '../fixtures/notes';
import { DEMO_NOTES_KO_TEXT } from '../fixtures/notes.ko';
import { DEMO_STUDENTS } from '../fixtures/students';
import { ASSESSMENTS, MATH_ARC, STAT_TILES, TREND } from '../fixtures/learning';
import { APPLICATIONS, APPLICANT, autofillStats, daysUntil } from '../fixtures/applications';
import { DEMO_ADVISOR_PLAN } from '../fixtures/advisor-plan';
import { DEMO_ADVISOR_PLAN_KO } from '../fixtures/advisor-plan.ko';
import { citedNoteIds } from '@/lib/newton-advisor';

const seojun = DEMO_STUDENTS[0];
const allNoteText = DEMO_NOTES.map(n => n.raw_memo).join('\n');

describe('학년 정합성', () => {
  it('입학 노트의 학년 + 경과 학년수가 현재 학년과 맞는다', () => {
    // 2025-08 입학(Grade 10) → 2026-08 현재는 Grade 11.
    expect(DEMO_NOTES[0].raw_memo).toContain('joins Grade 10 in August');
    expect(seojun.grade).toBe('Grade 11');
  });

  it('노트가 언급하는 진학 학년이 현재 학년의 다음 학년이다', () => {
    // 마지막 노트(2026-08)는 곧 시작할 학년을 이야기한다 = 현재 표시 학년과 동일.
    const last = DEMO_NOTES[DEMO_NOTES.length - 1].raw_memo;
    expect(last).toContain('Grade 11');
    expect(seojun.grade).toBe('Grade 11');
  });

  it('반 번호가 학년과 일치한다', () => {
    for (const s of DEMO_STUDENTS) {
      const gradeNum = s.grade.replace('Grade ', '');
      expect(s.homeroom.startsWith(`${gradeNum}-`)).toBe(true);
    }
  });
});

describe('성적 데이터 정합성', () => {
  it('평가 점수 배열이 노트가 명시한 연간 궤적과 같다', () => {
    expect(ASSESSMENTS.map(a => a.score)).toEqual(MATH_ARC);
  });

  it('추이 그래프가 평가 목록과 같은 점수를 쓴다', () => {
    expect(TREND.map(pt => pt.score)).toEqual(MATH_ARC);
  });

  it('수학 평균 타일이 실제 평균과 일치한다', () => {
    const avg = MATH_ARC.reduce((a, b) => a + b, 0) / MATH_ARC.length;
    const tile = STAT_TILES.find(t => /Math average|수학 평균/.test(t.label));
    expect(tile?.value).toBe(`${avg.toFixed(1)}%`);
  });

  it('상담 기록 수 타일·콘솔 카운트가 실제 노트 수와 같다', () => {
    expect(seojun.noteCount).toBe(DEMO_NOTES.length);
    const tile = STAT_TILES.find(t => /Advising notes|상담 기록/.test(t.label));
    expect(tile?.value.replace(/[^0-9]/g, '')).toBe(String(DEMO_NOTES.length));
  });

  it('결석 수가 노트의 월요일 결석 서술과 어긋나지 않는다', () => {
    expect(seojun.absences).toBeGreaterThan(0);
    expect(allNoteText).toContain('Monday');
  });
});

describe('한국어판 정합성', () => {
  it('영문 노트와 1:1로 대응한다', () => {
    expect(DEMO_NOTES_KO_TEXT).toHaveLength(DEMO_NOTES.length);
    expect(DEMO_NOTES_KO_TEXT.map(n => n.id)).toEqual(DEMO_NOTES.map(n => n.id));
  });

  it('모든 한국어 노트에 본문이 있다', () => {
    for (const n of DEMO_NOTES_KO_TEXT) expect(n.memo.trim().length).toBeGreaterThan(20);
  });

  it('한국어 플랜도 실존하는 노트만 인용한다', () => {
    const known = new Set(DEMO_NOTES.map(n => n.id));
    for (const plan of [DEMO_ADVISOR_PLAN, DEMO_ADVISOR_PLAN_KO]) {
      expect(citedNoteIds(plan).filter(id => !known.has(id))).toEqual([]);
    }
  });
});

describe('대학 원서 정합성', () => {
  it('지원자는 콘솔 목록에 있는 12학년 학생이다', () => {
    const inConsole = DEMO_STUDENTS.find(s => s.name === APPLICANT.name);
    expect(inConsole).toBeDefined();
    expect(inConsole!.grade).toBe('Grade 12');
  });

  it('자동 입력 서류 수가 실제 출처 집계와 같다', () => {
    const { auto, total } = autofillStats();
    const manual = APPLICATIONS.flatMap(a => a.requirements).filter(r => r.source === 'Manual').length;
    expect(total - auto).toBe(manual);
    expect(auto).toBeGreaterThan(total / 2);
  });

  it('제출 완료 원서는 준비물이 전부 채워져 있다', () => {
    for (const a of APPLICATIONS.filter(a => a.status === 'Submitted')) {
      expect(a.requirements.every(r => r.done)).toBe(true);
    }
  });

  it('미시작 원서는 마감이 제출 완료 건보다 늦다', () => {
    const latestSubmitted = Math.max(
      ...APPLICATIONS.filter(a => a.status === 'Submitted').map(a => Date.parse(a.deadline))
    );
    for (const a of APPLICATIONS.filter(a => a.status === 'Not started')) {
      expect(Date.parse(a.deadline)).toBeGreaterThan(latestSubmitted);
    }
  });

  it('다음 마감 D-day가 양수다 (기준일 2026-08-10)', () => {
    const todayMs = Date.parse('2026-08-10T00:00:00Z');
    const next = [...APPLICATIONS]
      .filter(a => a.status !== 'Submitted')
      .sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
    expect(daysUntil(next.deadline, todayMs)).toBeGreaterThan(0);
  });
});
