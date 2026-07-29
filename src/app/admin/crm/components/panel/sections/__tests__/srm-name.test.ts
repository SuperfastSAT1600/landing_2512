import { describe, it, expect } from 'vitest';
import { stripNameSuffix } from '../srm-name';

describe('stripNameSuffix', () => {
  it('이름 끝의 숫자 접미사를 제거한다', () => {
    expect(stripNameSuffix('박시연03')).toBe('박시연');
  });

  it('이름과 숫자 사이 공백도 함께 제거한다', () => {
    expect(stripNameSuffix('박시연 03')).toBe('박시연');
  });

  it('숫자 접미사가 없으면 그대로 둔다', () => {
    expect(stripNameSuffix('홍길동')).toBe('홍길동');
  });

  it('이미 순수 이름이면 변화가 없다', () => {
    expect(stripNameSuffix('박시연')).toBe('박시연');
  });

  it('여러 자리 숫자 접미사도 제거한다', () => {
    expect(stripNameSuffix('김민재12')).toBe('김민재');
  });
});
