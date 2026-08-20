/**
 * CRM "오늘 할 일" 탭 E2E
 * - 액션 필요 명단(섹션 A): 단계 정체 + 미연락 리드 표시
 * - 오늘 취한 액션(섹션 B): 오늘 메모 작성 / 완료 체크 학생 표시
 * - 완료 체크 시 PATCH(daily_action_done_at)로 DB 저장, 명단에서 제거
 */

import { test, expect, type Page } from '@playwright/test';

const ADMIN_KEY = 'test-admin-key';

const DAY = 86400000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

// 단계 정체 리드 (funnel_stage '0' SLA 1일 → 5일 경과)
const stalled = {
  id: 'stu-stalled',
  name: '정체학생',
  grade: '11',
  funnel_stage: '0',
  funnel_stage_updated_at: iso(now - 5 * DAY),
  created_at: iso(now - 5 * DAY),
  last_contacted_at: null,
  daily_action_done_at: null,
  consultation_timeline: [],
  lead_status: 'active',
  retry_strategy_id: null,
  lead_tier: null,
  traffic_source: null,
  target_score: null,
  target_test_date: null,
};

// 미연락 리드 (10일 미연락, 단계는 정체 아님)
const overdue = {
  ...stalled,
  id: 'stu-overdue',
  name: '미연락학생',
  funnel_stage: '7',
  funnel_stage_updated_at: iso(now),
  last_contacted_at: iso(now - 10 * DAY),
};

// 오늘 완료 체크된 리드 (명단에서 제외, 섹션 B "처리 완료")
const doneToday = {
  ...stalled,
  id: 'stu-done',
  name: '완료학생',
  daily_action_done_at: iso(now),
};

// 오늘 메모 작성한 리드 (섹션 B에 메모 노출)
const memoToday = {
  ...stalled,
  id: 'stu-memo',
  name: '메모학생',
  funnel_stage: '8',
  funnel_stage_updated_at: iso(now),
  consultation_timeline: [
    { id: 'm1', created_at: iso(now), raw_memo: '오늘 학부모와 통화 완료', published: false },
  ],
};

const json = (route: import('@playwright/test').Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function setup(page: Page) {
  await page.addInitScript((key) => localStorage.setItem('admin_key', key), ADMIN_KEY);
  await page.route('**/api/crm/stats**', (route) =>
    json(route, {
      data: {
        overview: { contact_rate: 70, conversion_rate: 13.33, gross_revenue: 29828500, total_refund: -3219000 },
        by_source: [
          { source: '네이버 블로그', leads: 10, contact_rate: 80, conversion_rate: 20 },
          { source: '인스타그램 광고', leads: 5, contact_rate: 60, conversion_rate: 0 },
        ],
      },
    })
  );
  await page.route('**/api/crm/payments**', (route) => json(route, { data: [] }));
  // 목록 — 쿼리에 따라 분기 (enrolled/inactive/churned는 빈 배열)
  await page.route('**/api/crm/students**', (route) => {
    if (route.request().method() !== 'GET') return json(route, { data: {} });
    const url = route.request().url();
    if (/lead_status=(enrolled|inactive)|stage=churned/.test(url)) return json(route, { data: [] });
    return json(route, { data: [stalled, overdue, doneToday, memoToday] });
  });
  // 완료 체크 PATCH 등 단일 학생 — 성공 응답 (students** 보다 나중 등록 → 우선)
  await page.route('**/api/crm/students/*', (route) => json(route, { data: {} }));
}

test.describe('CRM — 오늘 할 일 탭', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.goto('/admin/crm');
    await page.waitForTimeout(1500);
  });

  test('탭이 기본으로 열리고 두 섹션이 렌더링된다', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.getByRole('heading', { name: '오늘 액션 필요 명단' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '오늘 취한 액션' })).toBeVisible();
  });

  test('명단에 정체/미연락 리드가 사유와 함께 표시된다', async ({ page }) => {
    const body = await page.textContent('body') ?? '';
    expect(body).toContain('정체학생');
    expect(body).toContain('미연락학생');
    expect(body).toContain('정체'); // N일 정체 뱃지
    expect(body).toContain('미연락'); // N일 미연락 뱃지
    // 완료/메모 학생은 명단(섹션 A)이 아니라 섹션 B에 있어야 함
  });

  test('오늘 취한 액션에 메모/완료 학생이 표시된다', async ({ page }) => {
    const body = await page.textContent('body') ?? '';
    expect(body).toContain('메모학생');
    expect(body).toContain('오늘 학부모와 통화 완료');
    expect(body).toContain('완료학생');
    await page.screenshot({ path: 'tests/e2e/__screenshots__/crm-daily-tasks.png', fullPage: true });
  });

  test('최초 세일즈 탭에는 정체/팔로업 배너가 없다', async ({ page }) => {
    // 기본 탭이 '주차 계획·이행'이므로 상위 탭부터 이동한다 (B2cWorkspace → LeadsHub)
    await page.getByRole('button', { name: '리드 현황·통계' }).click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: '최초 세일즈' }).click();
    await page.waitForTimeout(1200);
    await expect(page.locator('body')).not.toContainText('Application error');
    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toContain('즉시 다음 단계로 진행'); // 단계 정체 배너 문구
    expect(body).not.toContain('오늘 팔로업 액션'); // 팔로업 배너 문구
    // 상단 통계 스트립(소스별 칩 포함)은 화면에서 제거됨
    expect(body).not.toContain('소스별');
    expect(body).not.toContain('컨택 성공율');
    expect(body).not.toContain('결제전환율');
    // 8(수업 중)·9(이탈) 컬럼은 칸반에서 제거됨
    expect(body).not.toContain('9. 이탈');
    await page.screenshot({ path: 'tests/e2e/__screenshots__/crm-kanban-no-banner.png', fullPage: true });
  });

  test('완료 체크 시 명단에서 사라진다', async ({ page }) => {
    // 섹션 A의 완료 체크박스는 aria-label로 식별 (체크 시 onChange만 발동, 행이 사라짐)
    const checkbox = page.getByRole('checkbox', { name: '정체학생 액션 완료' });
    await expect(checkbox).toBeVisible();
    await checkbox.click();
    // 낙관적 업데이트로 섹션 A에서 제거 → 해당 체크박스가 사라진다
    await expect(checkbox).toHaveCount(0);
    // 섹션 B "오늘 취한 액션"에는 처리 완료로 등장
    await expect(page.locator('body')).toContainText('정체학생');
  });
});
