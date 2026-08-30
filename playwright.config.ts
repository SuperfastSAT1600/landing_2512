import { defineConfig, devices } from '@playwright/test';

/**
 * CI 게이트에 넣는 스펙 목록.
 *
 * 기준은 **hermetic**: page.route로 네트워크를 전부 막아 실 Supabase·시크릿 없이 돌아간다.
 * 나머지 스펙(diagnosis-*, vocab-tracking, blog-thumbnail, report-* 등)은 실 DB의 시드 데이터에
 * 의존해 CI에서 돌릴 수 없다. report-page/report-sections는 모듈 로드 시점에 서비스 롤 키로
 * Supabase 클라이언트를 만들어 **프로덕션 DB에 쓰기** 때문에 CI에 절대 넣지 않는다.
 * 새 스펙을 여기 추가할 땐 그 스펙이 외부 네트워크를 하나도 타지 않는지 먼저 확인할 것.
 */
const CI_SPECS = [
  'crm-daily-tasks.spec.ts',
  'crm-payment-zero-amount.spec.ts',
  'crm-stats-segment.spec.ts',
  'admin-smoke.spec.ts',
  'token-management.spec.ts',
  'diagnosis-application.spec.ts',
];

// 제외 사유 메모 (다시 넣으려다 같은 실패를 반복하지 않도록):
// - admin-post-status-toggle: /blog 는 서버 컴포넌트가 Supabase를 직접 조회한다.
//   page.route는 서버측 fetch를 막을 수 없어(스펙 주석에도 명시됨) 실 DB에 게시글이
//   최소 1건 있어야 통과한다.

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // CI 게이트 — `npx playwright test --project=ci`
      name: 'ci',
      use: { ...devices['Desktop Chrome'] },
      testMatch: CI_SPECS,
    },
  ],
  webServer: {
    command: 'npx next dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
