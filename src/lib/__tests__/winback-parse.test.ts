import { describe, it, expect } from 'vitest';
import { parseRecommendResponse, AiResponseError } from '@/lib/winback/parse';

const VALID = new Set(['a', 'b', 'c']);

describe('parseRecommendResponse', () => {
  it('순수 JSON을 파싱한다', () => {
    const out = parseRecommendResponse(
      JSON.stringify({ picks: [{ id: 'a', fit: 5, reason: '5월 AP 시험 대비 문의 이력' }] }),
      VALID
    );
    expect(out.picks).toEqual([{ id: 'a', fit: 5, reason: '5월 AP 시험 대비 문의 이력' }]);
  });

  it('코드펜스와 앞뒤 잡담을 감싸도 파싱한다', () => {
    const raw = [
      '분석했습니다.',
      '```json',
      JSON.stringify({ picks: [{ id: 'b', fit: 4, reason: '수업료 부담으로 보류했던 리드' }] }),
      '```',
      '이상입니다.',
    ].join('\n');
    expect(parseRecommendResponse(raw, VALID).picks[0].id).toBe('b');
  });

  it('후보 목록에 없는 id는 버린다 (LLM 환각 방어)', () => {
    const raw = JSON.stringify({
      picks: [
        { id: 'zzz', fit: 5, reason: '없는 학생' },
        { id: 'a', fit: 4, reason: '있는 학생' },
      ],
    });
    expect(parseRecommendResponse(raw, VALID).picks.map((p) => p.id)).toEqual(['a']);
  });

  it('적합도 임계 미만은 제외한다', () => {
    const raw = JSON.stringify({
      picks: [
        { id: 'a', fit: 2, reason: '약함' },
        { id: 'b', fit: 3, reason: '보통' },
      ],
    });
    expect(parseRecommendResponse(raw, VALID, 3).picks.map((p) => p.id)).toEqual(['b']);
  });

  it('fit이 적합도 범위를 벗어나면 스키마 위반으로 throw', () => {
    const raw = JSON.stringify({ picks: [{ id: 'a', fit: 9, reason: 'x' }] });
    expect(() => parseRecommendResponse(raw, VALID)).toThrow(AiResponseError);
  });

  it('JSON이 없으면 throw', () => {
    expect(() => parseRecommendResponse('죄송합니다, 판단할 수 없습니다.', VALID)).toThrow(
      AiResponseError
    );
  });

  it('picks가 비어 있어도 유효한 응답으로 본다 (적합 리드가 없을 수 있다)', () => {
    expect(parseRecommendResponse(JSON.stringify({ picks: [] }), VALID).picks).toEqual([]);
  });

  it('angle·risk는 선택 필드로 통과시킨다', () => {
    const raw = JSON.stringify({
      picks: [
        { id: 'c', fit: 5, reason: '가격 부담으로 보류', angle: '부담 낮춘 단기 패키지', risk: '일정 충돌' },
      ],
    });
    const pick = parseRecommendResponse(raw, VALID).picks[0];
    expect(pick.angle).toBe('부담 낮춘 단기 패키지');
    expect(pick.risk).toBe('일정 충돌');
  });
});
