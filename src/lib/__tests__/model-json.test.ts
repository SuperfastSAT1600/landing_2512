import { describe, it, expect } from 'vitest';
import { parseJsonObject } from '../model-json';

describe('parseJsonObject', () => {
  it('앞뒤 설명·코드펜스가 붙은 모델 응답에서 JSON 객체를 꺼낸다', () => {
    expect(parseJsonObject('결과입니다:\n```json\n{"a": 1, "b": {"c": "x"}}\n```\n끝')).toEqual({ a: 1, b: { c: 'x' } });
  });

  it('객체가 없거나 깨졌으면 null', () => {
    expect(parseJsonObject('JSON 없음')).toBeNull();
    expect(parseJsonObject('{"a": 1')).toBeNull();
    expect(parseJsonObject('} 거꾸로 {')).toBeNull();
  });

  it('첫 { 부터 자르므로 배열로 감싼 응답에서도 안쪽 객체를 꺼낸다', () => {
    expect(parseJsonObject('[{"a":1}]')).toEqual({ a: 1 });
    expect(parseJsonObject('{} ')).toEqual({});
  });
});
