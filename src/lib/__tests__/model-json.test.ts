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

  // qwen-max가 문자열 값 안의 줄바꿈을 이스케이프하지 않고 내보내는 경우(2026-11-04 학부모 초안 실패)
  it('문자열 안의 날 줄바꿈·탭을 복구해 파싱한다', () => {
    // JS 문자열의 \n·\r·\t는 실제 제어문자 → 모델이 보낸 "날" 줄바꿈과 같다
    const raw = '{"purified": "1. 정보\n· 10학년\r\n\t· 국제학교", "deleted_items": []}';
    expect(parseJsonObject(raw)).toEqual({ purified: '1. 정보\n· 10학년\r\n\t· 국제학교', deleted_items: [] });
  });

  it('복구할 때 이스케이프된 따옴표·역슬래시와 문자열 밖 줄바꿈은 그대로 둔다', () => {
    const raw = '{\n  "a": "그가 \\"안녕\\" 했다\n둘째 줄 C:\\\\x",\n  "b": 1\n}';
    expect(parseJsonObject(raw)).toEqual({ a: '그가 "안녕" 했다\n둘째 줄 C:\\x', b: 1 });
  });

  it('복구해도 깨진 JSON이면 null', () => {
    expect(parseJsonObject('{"a": "줄\n바꿈", }')).toBeNull();
  });
});
