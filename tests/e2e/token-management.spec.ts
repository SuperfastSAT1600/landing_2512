/**
 * E2E: 진단테스트 토큰 관리 — 삭제 및 만료일시 수정
 *
 * 검증 항목:
 * 1. pending 토큰 삭제 성공 → 목록에서 제거됨
 * 2. completed 토큰 삭제 버튼 비활성화
 * 3. 만료일시 클릭 → datetime 입력 전환 → 저장
 * 4. 만료일시 수정 취소 → 원래 값 복원
 */

import { test, expect, type Page } from '@playwright/test';

const ADMIN_KEY = 'test-admin-key';

const PENDING_TOKEN = {
  id: 'tk-pending-1',
  token: '123456',
  student_name: '테스트학생',
  student_email: null,
  expires_at: '2026-12-31T23:59:00.000Z',
  is_active: true,
  created_at: '2026-03-29T10:00:00.000Z',
  status: 'pending',
  test_version_id: null,
};

const COMPLETED_TOKEN = {
  id: 'tk-completed-1',
  token: '654321',
  student_name: '완료학생',
  student_email: null,
  expires_at: '2026-12-31T23:59:00.000Z',
  is_active: true,
  created_at: '2026-03-28T10:00:00.000Z',
  status: 'completed',
  test_version_id: null,
};

async function setAdminAuth(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem('admin_key', key);
  }, ADMIN_KEY);
}

async function mockSupportApis(page: Page) {
  await page.route('**/api/admin/diagnosis/versions**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ versions: [{ id: 'v-1', version_number: 1, is_current: true }] }),
    })
  );
  await page.route('**/api/admin/diagnosis/results**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) })
  );
  await page.route('**/api/admin/diagnosis/question-stats**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ stats: [] }) })
  );
}

// ──────────────────────────────────────────────────────────────
// Suite
// ──────────────────────────────────────────────────────────────

test.describe('토큰 관리 — 삭제', () => {
  test.beforeEach(async ({ page }) => {
    await setAdminAuth(page);
    await mockSupportApis(page);
  });

  test('pending 토큰 삭제 후 목록에서 제거됨', async ({ page }) => {
    let deleted = false;

    // [id] route: DELETE → soft-delete 성공
    await page.route(/\/api\/admin\/diagnosis\/tokens\/[^/?]+/, (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        route.continue();
      }
    });

    // list route: GET → deleted 여부에 따라 목록 변경
    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'GET') {
        const codes = deleted ? [COMPLETED_TOKEN] : [PENDING_TOKEN, COMPLETED_TOKEN];
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    // 두 학생 모두 표시 확인
    await expect(page.getByText('테스트학생')).toBeVisible();
    await expect(page.getByText('완료학생')).toBeVisible();

    // confirm 대화상자 자동 수락
    page.once('dialog', (dialog) => dialog.accept());

    // pending 행의 삭제 버튼 클릭
    const pendingRow = page.locator('tr', { has: page.getByText('테스트학생') });
    await pendingRow.getByRole('button', { name: '삭제' }).click();

    // 목록 새로고침 대기
    await page.waitForTimeout(1200);

    // 테스트학생 사라지고 완료학생은 유지
    await expect(page.getByText('테스트학생')).not.toBeVisible();
    await expect(page.getByText('완료학생')).toBeVisible();
  });

  test('삭제 confirm 취소 시 목록 유지', async ({ page }) => {
    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [PENDING_TOKEN, COMPLETED_TOKEN] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    // confirm 대화상자 거절
    page.once('dialog', (dialog) => dialog.dismiss());

    const pendingRow = page.locator('tr', { has: page.getByText('테스트학생') });
    await pendingRow.getByRole('button', { name: '삭제' }).click();

    await page.waitForTimeout(500);

    // 두 학생 모두 유지
    await expect(page.getByText('테스트학생')).toBeVisible();
    await expect(page.getByText('완료학생')).toBeVisible();
  });

  test('completed 토큰 삭제 버튼 비활성화', async ({ page }) => {
    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [COMPLETED_TOKEN] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    const completedRow = page.locator('tr', { has: page.getByText('완료학생') });
    const deleteBtn = completedRow.getByRole('button', { name: '삭제' });
    await expect(deleteBtn).toBeDisabled();
  });
});

test.describe('토큰 관리 — 만료일시 수정', () => {
  test.beforeEach(async ({ page }) => {
    await setAdminAuth(page);
    await mockSupportApis(page);
  });

  test('만료일시 클릭 → datetime 입력 전환 → 저장', async ({ page }) => {
    let patchCalled = false;
    let patchBody: { expiresAt?: string } = {};

    // [id] route: PATCH → 성공
    await page.route(/\/api\/admin\/diagnosis\/tokens\/[^/?]+/, (route) => {
      if (route.request().method() === 'PATCH') {
        patchCalled = true;
        patchBody = route.request().postDataJSON() as { expiresAt?: string };
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, expiresAt: '2027-06-30T12:00:00.000Z' }),
        });
      } else {
        route.continue();
      }
    });

    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [PENDING_TOKEN] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    // 만료일시 셀의 버튼 클릭 (4번째 열 = index 3)
    const pendingRow = page.locator('tr', { has: page.getByText('테스트학생') });
    const expiryCell = pendingRow.locator('td').nth(3);
    await expiryCell.locator('button').first().click();

    // datetime-local input 표시 확인
    const dateInput = expiryCell.locator('input[type="datetime-local"]');
    await expect(dateInput).toBeVisible();

    // 새 날짜 입력
    await dateInput.fill('2027-06-30T12:00');

    // 저장 버튼 클릭
    await expiryCell.getByRole('button', { name: '저장' }).click();

    await page.waitForTimeout(800);

    // PATCH API 호출 확인
    expect(patchCalled).toBe(true);
    expect(patchBody.expiresAt).toContain('2027');

    // input이 사라지고 버튼 상태로 복귀
    await expect(dateInput).not.toBeVisible();
  });

  test('만료일시 수정 취소 → 입력 닫힘', async ({ page }) => {
    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [PENDING_TOKEN] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    const pendingRow = page.locator('tr', { has: page.getByText('테스트학생') });
    const expiryCell = pendingRow.locator('td').nth(3);
    await expiryCell.locator('button').first().click();

    const dateInput = expiryCell.locator('input[type="datetime-local"]');
    await expect(dateInput).toBeVisible();

    // 취소 버튼 클릭
    await expiryCell.getByRole('button', { name: '취소' }).click();

    // input 닫히고 날짜 버튼 복원
    await expect(dateInput).not.toBeVisible();
    await expect(expiryCell.locator('button').first()).toBeVisible();
  });

  test('Escape 키로 만료일시 수정 취소', async ({ page }) => {
    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [PENDING_TOKEN] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    const pendingRow = page.locator('tr', { has: page.getByText('테스트학생') });
    const expiryCell = pendingRow.locator('td').nth(3);
    await expiryCell.locator('button').first().click();

    const dateInput = expiryCell.locator('input[type="datetime-local"]');
    await expect(dateInput).toBeVisible();

    await dateInput.press('Escape');

    await expect(dateInput).not.toBeVisible();
  });
});
