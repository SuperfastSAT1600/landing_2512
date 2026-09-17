/**
 * 재결제 칸반 — 컨택 예정일 E2E
 * - 진행 단계(1~3) 카드에만 날짜 입력칸이 뜨고, 터미널(4·5)에는 없다
 * - 컬럼이 예정일 임박순으로 선다 (지난 날짜 → 오늘 → 미래 → 미입력)
 * - 날짜를 고르면 PATCH { next_contact_date } 가 나간다
 *
 * 실 DB에 의존하지 않도록 crm-daily-tasks.spec.ts 와 같은 route 모킹을 쓴다.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

const ADMIN_KEY = 'test-admin-key';
const WEEK_START = '2026-09-14';

const json = (route: Route, body: unknown) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

const student = (id: string, name: string) => ({
  id,
  name,
  grade: '11th',
  parent_phone: '010-0000-0000',
  is_vip: false,
  needs_attention: false,
  traffic_source: null,
  lead_type: 'B2C',
});

/** 서버 정렬(stage_updated_at DESC)로 내려온 순서 — 보드가 임박순으로 다시 세워야 한다. */
function targets() {
  const base = {
    week_start: WEEK_START,
    converted_payment_id: null,
    drop_reason: null,
    memo: null,
    outcome_quality: null,
    outcome_reason_tag: null,
    outcome_reason_note: null,
    carried_to_week: null,
    carried_from_week: null,
    created_by: null,
    created_at: '2026-09-14T00:00:00Z',
    updated_at: '2026-09-14T00:00:00Z',
  };
  return [
    // stage 1 — 일부러 임박순의 역순으로 내려보낸다
    { ...base, id: 'rt-none', student_id: 's-none', stage: '1', stage_updated_at: '2026-09-16T00:00:00Z', next_contact_date: null, student: student('s-none', '예정없음') },
    { ...base, id: 'rt-far', student_id: 's-far', stage: '1', stage_updated_at: '2026-09-15T00:00:00Z', next_contact_date: '2026-12-01', student: student('s-far', '먼미래') },
    { ...base, id: 'rt-overdue', student_id: 's-overdue', stage: '1', stage_updated_at: '2026-09-14T00:00:00Z', next_contact_date: '2020-01-02', student: student('s-overdue', '지난약속') },
    { ...base, id: 'rt-soon', student_id: 's-soon', stage: '1', stage_updated_at: '2026-09-14T00:00:00Z', next_contact_date: '2026-09-30', student: student('s-soon', '가까운약속') },
    // stage 4 — 터미널이라 날짜 입력칸이 없어야 한다
    { ...base, id: 'rt-paid', student_id: 's-paid', stage: '4', stage_updated_at: '2026-09-15T00:00:00Z', next_contact_date: null, outcome_quality: 'good', outcome_reason_tag: '만족', student: student('s-paid', '결제완료') },
  ];
}

async function setup(page: Page) {
  const patches: Record<string, unknown>[] = [];

  await page.addInitScript((key) => localStorage.setItem('admin_key', key), ADMIN_KEY);
  await page.route('**/api/crm/stats**', (route) =>
    json(route, { data: { overview: { contact_rate: 0, conversion_rate: 0, gross_revenue: 0, total_refund: 0 }, by_source: [] } })
  );
  await page.route('**/api/crm/payments**', (route) => json(route, { data: [] }));
  await page.route('**/api/crm/students**', (route) => json(route, { data: [] }));
  await page.route('**/api/admin/srm/tutoring-users**', (route) => json(route, { linked: [] }));
  // renewal-targets 계열은 한 핸들러에서 분기한다 — 와일드카드가 서로를 잡아먹으면
  // stats 응답이 { data: {} } 로 내려가 보드가 통째로 죽는다.
  await page.route('**/api/crm/renewal-targets**', (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.endsWith('/carry-over')) {
      return json(route, { data: { week_start: WEEK_START, created: 0, closed: 0 } });
    }
    if (url.pathname.endsWith('/stats')) return json(route, { data: [] });
    if (req.method() === 'PATCH') {
      patches.push(req.postDataJSON() as Record<string, unknown>);
      return json(route, { data: {} });
    }
    return json(route, { data: targets() });
  });

  return patches;
}

async function openRenewalBoard(page: Page) {
  await page.goto(`${process.env.RENEWAL_E2E_BASE ?? ''}/admin/crm`);
  await page.getByRole('button', { name: '리드 현황·통계' }).click();
  await page.getByRole('button', { name: '재결제 세일즈' }).click();
  await expect(page.getByText('1. 최초 컨택 전')).toBeVisible();
}

test.describe('재결제 칸반 — 컨택 예정일', () => {
  test('진행 단계 카드에만 입력칸이 뜨고 임박순으로 선다', async ({ page }) => {
    await setup(page);
    await openRenewalBoard(page);

    // 1단계 컬럼의 카드 순서 — 지난약속 → 가까운약속 → 먼미래 → 예정없음
    const names = await page.locator('input[aria-label="컨택 예정일"]').count();
    expect(names).toBe(4); // stage 1 의 4장만. 결제완료 카드에는 없다.

    const order = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[aria-label="컨택 예정일"]'));
      return inputs.map((el) => {
        const card = el.closest('div.group');
        return card?.querySelector('span')?.textContent ?? '';
      });
    });
    expect(order).toEqual(['지난약속', '가까운약속', '먼미래', '예정없음']);

    await page.screenshot({ path: 'tests/e2e/__screenshots__/renewal-contact-date.png', fullPage: false });
  });

  test('날짜를 고르면 PATCH next_contact_date 가 나간다', async ({ page }) => {
    const patches = await setup(page);
    await openRenewalBoard(page);

    await page.locator('input[aria-label="컨택 예정일"]').last().fill('2026-09-25');
    await expect.poll(() => patches.length).toBeGreaterThan(0);
    expect(patches[0]).toEqual({ next_contact_date: '2026-09-25' });
  });
});
