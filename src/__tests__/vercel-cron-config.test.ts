// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * REQ-005 — vercel.json 크론 목록 가드.
 *
 * 이 파일이 존재하는 이유: 2026-08-13~08-18 사이 vercel.json이 상호 클로버로 두 번 깨졌다.
 * PR #251이 파일을 CRLF로 재작성하며 blog-topics를 지우고, PR #252가 되돌리며
 * weekly-business-report를 지웠다. 줄 전체가 달라 보여 git이 충돌 없이 한쪽을 통째로 채택했다.
 * 그 결과 2026-08-17 04:00 주간 리포트가 발송되지 않았다(크론 미등록).
 *
 * 크론을 의도적으로 추가·삭제할 때는 EXPECTED_CRONS도 같은 커밋에서 함께 고친다.
 * 줄바꿈 정규화는 .gitattributes(`vercel.json text eol=lf`)가 담당한다.
 */
const EXPECTED_CRONS: Record<string, string> = {
  '/api/cron/diagnosis-expiry': '0 0 * * *',
  '/api/cron/blog-topics': '0 0 * * *',
  // 월요일 04:00 KST = 일요일 19:00 UTC (Vercel 크론 타임존은 항상 UTC).
  // 두 리포트가 같은 슬롯을 쓴다 — 읽는 데이터도 올리는 메시지도 서로 다르다.
  '/api/cron/weekly-business-report': '0 19 * * 0',
  '/api/cron/marketing-weekly-report': '0 19 * * 0',
  // FB 광고비 동기화 (매일 02:00 KST = 17:00 UTC 전일)
  '/api/cron/fb-ad-spend-sync': '0 17 * * *',
  // 주간 방문자 리포트 (화요일 04:00 KST = 월요일 19:00 UTC)
  '/api/cron/weekly-visitor-report': '0 19 * * 2',
};

function readCrons(): { path: string; schedule: string }[] {
  const raw = readFileSync('vercel.json', 'utf8');
  return (JSON.parse(raw) as { crons?: { path: string; schedule: string }[] }).crons ?? [];
}

describe('vercel.json 크론 등록 (REQ-005)', () => {
  it('기대하는 크론이 정확히 등록되어 있다 (누락·추가 모두 실패)', () => {
    const actual = Object.fromEntries(readCrons().map((c) => [c.path, c.schedule]));

    expect(actual).toEqual(EXPECTED_CRONS);
  });

  it('크론 경로마다 실제 라우트 파일이 존재한다', () => {
    for (const path of Object.keys(EXPECTED_CRONS)) {
      const file = `src/app${path}/route.ts`;
      expect(() => readFileSync(file, 'utf8'), `${file} 없음`).not.toThrow();
    }
  });

  it('vercel.json은 LF만 사용한다 (CRLF 재작성이 클로버를 유발했음)', () => {
    expect(readFileSync('vercel.json', 'utf8')).not.toContain('\r');
  });
});
