import { describe, it, expect } from 'vitest';
import { classifyCall } from '../classify-call';

/**
 * 케이스는 전부 실제 `call_transcripts.recording_name` 값이다 (2026-09-01 감사).
 * 이름 규칙이 바뀌면 여기가 먼저 깨져야 한다.
 */
describe('classifyCall — REQ-103 통화 종류 분류', () => {
  it('첫 세일즈 콜과 Report 세일즈 콜은 new_sales', () => {
    expect(classifyCall('고두나 어머님_첫 세일즈콜')).toBe('new_sales');
    expect(classifyCall('Kevin Sukhwi Lee 어머님_첫 세일즈콜')).toBe('new_sales');
    expect(classifyCall('배시우 어머님_Report 세일즈 콜')).toBe('new_sales');
    expect(classifyCall('심예은 어머님_첫 세일즈 콜_2026-08-05 16:00:10')).toBe('new_sales');
    expect(classifyCall('김라희02 어머님_Report 세일즈콜')).toBe('new_sales');
  });

  it('재결제 콜은 renewal', () => {
    expect(classifyCall('오하린_재결제')).toBe('renewal');
    expect(classifyCall('김윤호 어머님_재결제 콜')).toBe('renewal');
    expect(classifyCall('조재우 어머님_재결제콜')).toBe('renewal');
  });

  it('이탈 캠페인 콜은 winback', () => {
    expect(classifyCall('박서진 아버님_이탈 캠페인 콜')).toBe('winback');
    expect(classifyCall('배시우 어머님_이탈 관리 캠페인콜')).toBe('winback');
  });

  it('코치변경·스케쥴·환불·동기부여는 ops', () => {
    expect(classifyCall('이혁진_코치변경')).toBe('ops');
    expect(classifyCall('엄채영,엄채윤 어머니_스케쥴 조율')).toBe('ops');
    expect(classifyCall('Eunice Cho_환불상담')).toBe('ops');
    expect(classifyCall('김예나 학생_동기부여 상담 콜')).toBe('ops');
  });

  it('세일즈가 아닌 쪽이 이긴다 — 섞인 이름은 학습에 넣지 않는다', () => {
    expect(classifyCall('권지안_코치변경 및 재결제')).toBe('ops');
    expect(classifyCall('이탈 관리_재결제 콜')).toBe('winback');
    expect(classifyCall('재결제 세일즈 콜')).toBe('renewal');
  });

  it('띄어쓰기가 달라도 같게 분류한다', () => {
    expect(classifyCall('코치 변경 상담')).toBe('ops');
    expect(classifyCall('첫세일즈콜')).toBe('new_sales');
    expect(classifyCall('스케줄 조율')).toBe('ops');
  });

  it('일반 명칭과 빈 이름은 unknown', () => {
    expect(classifyCall('조유신, 조유인 어머님_상담 콜')).toBe('unknown');
    expect(classifyCall('배시우 학생_상담 콜')).toBe('unknown');
    expect(classifyCall('')).toBe('unknown');
    expect(classifyCall(null)).toBe('unknown');
    expect(classifyCall(undefined)).toBe('unknown');
  });
});
