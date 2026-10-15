import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// CRM·SRM DB(Supabase)가 모두 서울 리전이다. 함수가 iad1(미국 동부)이면 DB 왕복마다 ~200ms가 붙는다.
describe('vercel.json — 함수 리전', () => {
  it('서울(icn1)에서 실행한다', () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'));
    expect(config.regions).toEqual(['icn1']);
  });
});
