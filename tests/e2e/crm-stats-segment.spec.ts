import { test, expect, type Page } from '@playwright/test';

const ADMIN_KEY = 'missionto1600!1600!';

async function setAdminAuth(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem('admin_key', key);
    localStorage.setItem('admin_user_name', '테스트');
  }, ADMIN_KEY);
}

function mockStatsApi(page: Page) {
  return page.route('**/api/crm/stats?**', (route) => {
    const url = new URL(route.request().url());
    const segment = url.searchParams.get('segment') || 'all';

    const totals: Record<string, number> = {
      all: 10,
      b2c: 7,
      b2b: 3,
    };

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          period: { from: '2026-08-01', to: '2026-08-12' },
          overview: {
            total_leads: totals[segment] ?? 0,
            contacted: 0,
            contacted_base: totals[segment] ?? 0,
            contact_rate: 0,
            paid: 0,
            conversion_rate: 0,
            total_revenue: 0,
            total_net_revenue: 0,
            gross_revenue: 0,
            total_refund: 0,
            first_payment_revenue: 0,
            repayment_revenue: 0,
          },
          by_source: [],
          monthly: [],
          weekly: [],
          stage_flow: [],
        },
      }),
    });
  });
}

async function mockCrmApis(page: Page) {
  await page.route('**/api/crm/students**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
  await mockStatsApi(page);
}

test.describe('CRM B2C 통계 세그먼트 필터', () => {
  test.beforeEach(async ({ page }) => {
    await setAdminAuth(page);
    await mockCrmApis(page);
  });

  test('통계 탭에 전체/B2C/B2B 탭이 표시되고 세그먼트별로 데이터가 바뀐다', async ({ page }) => {
    await page.goto('/admin/crm');
    await page.waitForLoadState('networkidle');

    // 통계 서브탭 진입
    await page.getByRole('button', { name: '통계', exact: true }).click();
    await page.waitForLoadState('networkidle');

    // 세그먼트 탭 확인
    const segmentTabs = page.getByTestId('stats-segment-tabs');
    await expect(segmentTabs.getByRole('button', { name: '전체', exact: true })).toBeVisible();
    await expect(segmentTabs.getByRole('button', { name: 'B2C', exact: true })).toBeVisible();
    await expect(segmentTabs.getByRole('button', { name: 'B2B', exact: true })).toBeVisible();

    // 전체 — 부제는 정확히 일치로 본다('B2C'가 'B2C+B2B'의 부분문자열이라 substring 매칭은 무의미)
    await expect(page.getByText('문의 기준 · B2C+B2B', { exact: true })).toBeVisible();
    await expect(page.locator('text=10').first()).toBeVisible();

    // B2C
    await segmentTabs.getByRole('button', { name: 'B2C', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('문의 기준 · B2C', { exact: true })).toBeVisible();
    await expect(page.locator('text=7').first()).toBeVisible();

    // B2B
    await segmentTabs.getByRole('button', { name: 'B2B', exact: true }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('문의 기준 · B2B', { exact: true })).toBeVisible();
    await expect(page.locator('text=3').first()).toBeVisible();
  });
});
