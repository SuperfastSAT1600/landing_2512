import { describe, it, expect } from 'vitest';
import {
  isDiagnosticDone,
  diagnosticSource,
  hasCurrentDiagnostic,
  hasLegacyDiagnostic,
} from '../diagnostic-status';

const base = {
  diagnostic_result_id: null,
  diagnostic_funnel_stage: null,
  legacy_diagnostic_taken_at: null,
};

describe('hasCurrentDiagnostic', () => {
  it('결과가 연결됐으면 완료', () => {
    expect(hasCurrentDiagnostic({ ...base, diagnostic_result_id: 'd1' })).toBe(true);
  });

  it('퍼널 4단계(Report 전달 필요) 이상이면 완료', () => {
    expect(hasCurrentDiagnostic({ ...base, diagnostic_funnel_stage: 4 })).toBe(true);
    expect(hasCurrentDiagnostic({ ...base, diagnostic_funnel_stage: 5 })).toBe(true);
  });

  it('3단계 이하는 아직 완료가 아니다', () => {
    expect(hasCurrentDiagnostic({ ...base, diagnostic_funnel_stage: 3 })).toBe(false);
    expect(hasCurrentDiagnostic(base)).toBe(false);
  });
});

describe('hasLegacyDiagnostic', () => {
  it('2025 구 진단 응시일이 있으면 응시한 것', () => {
    expect(
      hasLegacyDiagnostic({ ...base, legacy_diagnostic_taken_at: '2025-07-05T00:00:00Z' })
    ).toBe(true);
  });

  it('필드가 아예 없어도(기존 호출부) 안전하게 false', () => {
    expect(hasLegacyDiagnostic({ diagnostic_result_id: null, diagnostic_funnel_stage: null })).toBe(
      false
    );
  });
});

describe('isDiagnosticDone — 구·현행을 하나로 본다', () => {
  it('현행만 있어도 완료', () => {
    expect(isDiagnosticDone({ ...base, diagnostic_result_id: 'd1' })).toBe(true);
  });

  it('레거시만 있어도 완료', () => {
    expect(isDiagnosticDone({ ...base, legacy_diagnostic_taken_at: '2025-07-05T00:00:00Z' })).toBe(
      true
    );
  });

  it('둘 다 없으면 미완료', () => {
    expect(isDiagnosticDone(base)).toBe(false);
  });
});

describe('diagnosticSource — 어느 쪽으로 완료됐는지', () => {
  it('현행이 있으면 레거시가 같이 있어도 current', () => {
    expect(
      diagnosticSource({
        ...base,
        diagnostic_result_id: 'd1',
        legacy_diagnostic_taken_at: '2025-07-05T00:00:00Z',
      })
    ).toBe('current');
  });

  it('레거시만이면 legacy', () => {
    expect(diagnosticSource({ ...base, legacy_diagnostic_taken_at: '2025-07-05T00:00:00Z' })).toBe(
      'legacy'
    );
  });

  it('없으면 null', () => {
    expect(diagnosticSource(base)).toBeNull();
  });
});
