import { describe, it, expect } from 'vitest';
import { CRM_LABELS_KO, CRM_LABELS_EN, resolveCrmLabels, type CrmLabels } from '@/lib/crm-labels';

describe('resolveCrmLabels', () => {
  it('미지정이면 기존 한글 문구를 그대로 쓴다 (프로덕션 CRM 무영향)', () => {
    const L = resolveCrmLabels();
    expect(L).toEqual(CRM_LABELS_KO);
    expect(L.timelineTitle).toBe('상담 타임라인');
    expect(L.memoTitle).toBe('상담 메모');
    expect(L.memoSave).toBe('메모 저장');
    expect(L.entryDateLocale).toBe('ko-KR');
  });

  it('undefined를 명시적으로 넘겨도 한글 기본값이다', () => {
    expect(resolveCrmLabels(undefined).timelineTitle).toBe('상담 타임라인');
  });

  it('EN 사전을 주입하면 영문으로 바뀐다', () => {
    const L = resolveCrmLabels(CRM_LABELS_EN);
    expect(L.timelineTitle).toBe('Advising Notes');
    expect(L.entryDateLocale).toBe('en-US');
  });

  it('부분 지정 시 나머지는 한글 기본값이 남는다', () => {
    const L = resolveCrmLabels({ timelineTitle: 'Notes' });
    expect(L.timelineTitle).toBe('Notes');
    expect(L.memoTitle).toBe('상담 메모');
  });

  it('두 사전이 같은 키 집합을 갖는다 (영문 누락 방지)', () => {
    expect(Object.keys(CRM_LABELS_EN).sort()).toEqual(Object.keys(CRM_LABELS_KO).sort());
  });

  it('모든 값이 비어 있지 않다', () => {
    for (const dict of [CRM_LABELS_KO, CRM_LABELS_EN]) {
      for (const key of Object.keys(dict) as (keyof CrmLabels)[]) {
        expect(dict[key].length).toBeGreaterThan(0);
      }
    }
  });
});
