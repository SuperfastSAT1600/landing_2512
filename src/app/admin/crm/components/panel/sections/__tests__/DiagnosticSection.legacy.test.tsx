/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DiagnosticSection } from '../DiagnosticSection';
import type { LegacyDiag } from '../../hooks/useDiagnostic';
import type { Student } from '@/types/crm';

const STUDENT = {
  id: 's1',
  name: 'Surin Lee',
  diagnostic_funnel_stage: null,
  diagnostic_result_id: null,
} as unknown as Student;

function renderSection(legacy: LegacyDiag[]) {
  return render(
    <DiagnosticSection
      localStudent={STUDENT}
      onDiagFunnelChange={vi.fn()}
      diagLinked={null}
      diagLegacy={legacy}
      diagCandidates={[]}
      showDiagPicker={false}
      setShowDiagPicker={vi.fn()}
      diagLoading={false}
      diagSearchQuery=""
      setDiagSearchQuery={vi.fn()}
      onDiagLink={vi.fn()}
    />
  );
}

const legacy = (over: Partial<LegacyDiag> = {}): LegacyDiag => ({
  id: 'l1',
  student_grade: 'Y11',
  score: 400,
  rw_score: 200,
  math_score: 200,
  taken_at: '2025-09-26T05:57:24.013+00:00',
  match_confidence: 'high',
  ...over,
});

describe('DiagnosticSection — 2025 구 진단 표시', () => {
  it('구 진단 이력이 없으면 아무것도 보이지 않는다', () => {
    renderSection([]);
    expect(screen.queryByText('2025 구 진단테스트')).toBeNull();
  });

  it('응시일을 보여준다', () => {
    renderSection([legacy()]);
    expect(screen.getByText('2025 구 진단테스트')).toBeTruthy();
    expect(screen.getByText(/2025-09-26 응시/)).toBeTruthy();
  });

  it('채점이 저장되지 않은 응시는 점수 대신 "점수 기록 없음"을 보여준다 — 400점으로 읽히면 안 된다', () => {
    renderSection([legacy()]);
    expect(screen.getByText(/점수 기록 없음/)).toBeTruthy();
    expect(screen.queryByText(/400점/)).toBeNull();
  });

  it('정상 점수는 섹션 점수까지 보여준다', () => {
    renderSection([legacy({ score: 1108, rw_score: 514, math_score: 594 })]);
    expect(screen.getByText(/1108점/)).toBeTruthy();
    expect(screen.getByText(/RW 514 \/ Math 594/)).toBeTruthy();
    expect(screen.queryByText(/점수 기록 없음/)).toBeNull();
  });

  it('매칭 확신도가 high가 아니면 "확인 필요" 뱃지를 단다', () => {
    renderSection([legacy({ match_confidence: 'medium' })]);
    expect(screen.getByText('확인 필요')).toBeTruthy();
  });

  it('재응시는 여러 줄로 모두 보여준다', () => {
    renderSection([legacy({ id: 'l1' }), legacy({ id: 'l2', taken_at: '2025-10-02T00:00:00Z' })]);
    expect(screen.getByText(/2025-09-26 응시/)).toBeTruthy();
    expect(screen.getByText(/2025-10-02 응시/)).toBeTruthy();
  });
});
