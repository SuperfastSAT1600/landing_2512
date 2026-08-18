/**
 * CRM 결제 히스토리 — 가결제(0원) 표시 + 금액·시간 인라인 수정 E2E
 * - 0원 결제가 "가결제" 뱃지와 함께 보인다
 * - 수정 버튼 → 금액/시간 편집 → 저장 시 PATCH 호출 및 화면 갱신
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const ADMIN_KEY = 'test-admin-key';

const student = {
  id: 'stu-1',
  name: '정예준',
  grade: '11',
  funnel_stage: '8',
  funnel_stage_updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  lead_status: 'enrolled',
  consultation_timeline: [],
  last_contacted_at: null,
  daily_action_done_at: null,
  retry_strategy_id: null,
  lead_tier: null,
  traffic_source: null,
  target_score: null,
  target_test_date: null,
};

const payment = {
  id: 'pay-1',
  student_id: 'stu-1',
  student_name: '정예준',
  product: 'SAT 정규 1:1 수업 (관리형)',
  product_category: 'SAT 정규 1:1 수업',
  product_subcategory: '관리형 수업',
  hours: 18,
  amount: 0,
  payment_type: '최초결제',
  tax_type: '과세',
  paid_at: '2026-08-10',
  created_by: '김우영',
  notes: null,
  created_at: '2026-08-10T07:05:27Z',
};

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

/** 저장 시 실제로 나간 PATCH 바디를 담는다. */
const patched: Record<string, unknown>[] = [];

async function setup(page: Page) {
  await page.addInitScript((key) => localStorage.setItem('admin_key', key), ADMIN_KEY);
  await page.route('**/api/crm/stats**', (route) =>
    json(route, {
      data: {
        overview: {
          contact_rate: 70,
          conversion_rate: 13.33,
          gross_revenue: 29828500,
          total_refund: -3219000,
          total_revenue: 26609500,
          total_net_revenue: 24000000,
        },
        by_source: [],
      },
    })
  );
  await page.route('**/api/crm/payments/*', (route) => {
    if (route.request().method() === 'PATCH') {
      patched.push(route.request().postDataJSON());
      return json(route, { data: { ...payment, ...route.request().postDataJSON() } });
    }
    return json(route, { data: {} });
  });
  await page.route('**/api/crm/payments?**', (route) => json(route, { data: [payment] }));
  await page.route('**/api/crm/students**', (route) => {
    if (route.request().method() !== 'GET') return json(route, { data: {} });
    return json(route, { data: [student] });
  });
  await page.route('**/api/crm/students/*', (route) => json(route, { data: student }));
}

/** 학생 패널을 열고 결제 히스토리 섹션을 펼친다. */
async function openPaymentHistory(page: Page) {
  await page.goto('/admin/crm');
  await page.waitForTimeout(1500);
  await page.getByText('정예준', { exact: false }).first().click();
  await page.waitForTimeout(800);
  await page.getByText('결제 히스토리', { exact: false }).first().click();
  await page.waitForTimeout(800);
}

test.describe('CRM 결제 히스토리 — 가결제 0원', () => {
  test.beforeEach(async ({ page }) => {
    patched.length = 0;
    await setup(page);
  });

  test('0원 결제가 가결제 뱃지와 함께 보이고 금액·시간을 수정할 수 있다', async ({ page }) => {
    await openPaymentHistory(page);

    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.getByText('가결제').first()).toBeVisible();
    await expect(page.getByText('₩0').first()).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/__screenshots__/crm-payment-zero-amount-view.png', fullPage: false });

    // 수정 모드 진입 → 실입금액/시간 입력
    await page.getByTitle('금액·시간 수정').first().click();
    await page.getByLabel('금액').fill('1200000');
    await page.getByLabel('시간').fill('12');
    await page.screenshot({ path: 'tests/e2e/__screenshots__/crm-payment-zero-amount-edit.png', fullPage: false });

    await page.getByRole('button', { name: '저장' }).click();
    await page.waitForTimeout(800);

    expect(patched).toContainEqual({ amount: 1200000, hours: 12 });
    await expect(page.getByText('₩1,200,000').first()).toBeVisible();
    await expect(page.getByText('가결제')).toHaveCount(0);
    await page.screenshot({ path: 'tests/e2e/__screenshots__/crm-payment-zero-amount-saved.png', fullPage: false });
  });
});
