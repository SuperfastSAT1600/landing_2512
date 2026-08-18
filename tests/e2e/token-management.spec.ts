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

// ──────────────────────────────────────────────────────────────
// Fixture for timezone tests
// ──────────────────────────────────────────────────────────────

const TZ_TOKEN = {
  id: 'tk-tz-1',
  token: '111222',
  student_name: '시간대학생',
  student_email: null,
  // 2027-07-15T00:00 UTC = 09:00 KST = 2027-07-14T17:00 PDT (UTC-7)
  expires_at: '2027-07-15T00:00:00.000Z',
  is_active: true,
  created_at: '2026-03-29T10:00:00.000Z',
  status: 'pending' as const,
  test_version_id: null,
};

// ──────────────────────────────────────────────────────────────
// Suite: TimezoneSelect
// ──────────────────────────────────────────────────────────────

test.describe('토큰 관리 — TimezoneSelect', () => {
  test.beforeEach(async ({ page }) => {
    await setAdminAuth(page);
    await mockSupportApis(page);
    // sessionStorage 격리: addInitScript는 per-test로 처리
    // (addInitScript를 여기에 두면 page.reload()에서도 실행되어 TZ-005 실패)
  });

  // REQ-TZ-001
  test('GenerateTokenTab 폼에 학생 시간대 select가 표시됨', async ({ page }) => {
    // 테스트 시작 전 sessionStorage 초기화 (reload 없이 첫 로드에만)
    await page.addInitScript(() => sessionStorage.removeItem('admin_preferred_timezone'));

    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    // 학생 시간대 레이블 확인
    await expect(page.getByText('학생 시간대')).toBeVisible();

    // full-mode select: optgroup[label="한국"] 을 포함하는 select
    const tzSelect = page.locator('select').filter({ has: page.locator('optgroup[label="한국"]') }).first();
    await expect(tzSelect).toBeVisible();
    await expect(tzSelect).toHaveValue('Asia/Seoul');

    // 국가별 timezone option 존재 확인 (optgroup은 hidden이므로 option으로 검증)
    await expect(tzSelect.locator('option[value="Asia/Seoul"]')).toHaveCount(1);
    await expect(tzSelect.locator('option[value="America/New_York"]')).toHaveCount(1);
    await expect(tzSelect.locator('option[value="America/Vancouver"]')).toHaveCount(1);
  });

  // REQ-TZ-002
  test('TokenListTable 인라인 수정 시 compact TimezoneSelect 표시됨', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem('admin_preferred_timezone'));

    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [TZ_TOKEN] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    const row = page.locator('tr', { has: page.getByText('시간대학생') });
    const expiryCell = row.locator('td').nth(3);
    await expiryCell.locator('button').first().click();

    // datetime-local input 표시
    const dateInput = expiryCell.locator('input[type="datetime-local"]');
    await expect(dateInput).toBeVisible();

    // compact select (title="시간대 선택") 표시
    const compactSelect = expiryCell.locator('select[title="시간대 선택"]');
    await expect(compactSelect).toBeVisible();
    await expect(compactSelect).toHaveValue('Asia/Seoul');

    // 미국 timezone option 존재 확인 (optgroup은 hidden이므로 option으로 검증)
    await expect(compactSelect.locator('option[value="America/New_York"]')).toHaveCount(1);
    await expect(compactSelect.locator('option[value="America/Los_Angeles"]')).toHaveCount(1);
  });

  // REQ-TZ-003
  test('인라인 저장 시 LA 시간대 기준 UTC 변환값이 PATCH body에 전송됨', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem('admin_preferred_timezone'));
    let patchBody: { expiresAt?: string } = {};

    await page.route(/\/api\/admin\/diagnosis\/tokens\/[^/?]+/, (route) => {
      if (route.request().method() === 'PATCH') {
        patchBody = route.request().postDataJSON() as { expiresAt?: string };
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
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
          body: JSON.stringify({ codes: [TZ_TOKEN] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    const row = page.locator('tr', { has: page.getByText('시간대학생') });
    const expiryCell = row.locator('td').nth(3);
    await expiryCell.locator('button').first().click();

    const dateInput = expiryCell.locator('input[type="datetime-local"]');
    await expect(dateInput).toBeVisible();

    // 시간대를 America/Los_Angeles 로 변경
    const compactSelect = expiryCell.locator('select[title="시간대 선택"]');
    await compactSelect.selectOption('America/Los_Angeles');

    // 2027-07-15T09:00 LA 로컬 입력
    // localToUTC('2027-07-15T09:00', 'America/Los_Angeles') = '2027-07-15T16:00:00.000Z' (PDT=UTC-7)
    await dateInput.fill('2027-07-15T09:00');

    await expiryCell.getByRole('button', { name: '저장' }).click();
    await page.waitForTimeout(800);

    expect(patchBody.expiresAt).toBe('2027-07-15T16:00:00.000Z');
    await expect(dateInput).not.toBeVisible();
  });

  // REQ-TZ-004
  test('시간대 변경 시 입력값이 같은 UTC 순간으로 재표현됨', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem('admin_preferred_timezone'));
    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [TZ_TOKEN] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    const row = page.locator('tr', { has: page.getByText('시간대학생') });
    const expiryCell = row.locator('td').nth(3);
    await expiryCell.locator('button').first().click();

    const dateInput = expiryCell.locator('input[type="datetime-local"]');
    await expect(dateInput).toBeVisible();

    // TZ_TOKEN.expires_at = '2027-07-15T00:00:00.000Z'
    // utcToLocal(..., 'Asia/Seoul') = '2027-07-15T09:00'
    await expect(dateInput).toHaveValue('2027-07-15T09:00');

    // LA로 변경 → handleTimezoneChange: 같은 UTC를 PDT로 재표현
    // utcToLocal('2027-07-15T00:00:00.000Z', 'America/Los_Angeles') = '2027-07-14T17:00'
    const compactSelect = expiryCell.locator('select[title="시간대 선택"]');
    await compactSelect.selectOption('America/Los_Angeles');

    await page.waitForTimeout(300);
    await expect(dateInput).toHaveValue('2027-07-14T17:00');
  });

  // REQ-TZ-005
  test('GenerateTokenTab 시간대 선택이 sessionStorage에 유지됨', async ({ page }) => {
    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    const tzSelect = page.locator('select').filter({ has: page.locator('optgroup[label="한국"]') }).first();
    await expect(tzSelect).toBeVisible();

    // America/New_York 선택
    await tzSelect.selectOption('America/New_York');

    // sessionStorage에 저장됐는지 확인
    const stored = await page.evaluate(() => sessionStorage.getItem('admin_preferred_timezone'));
    expect(stored).toBe('America/New_York');

    // 페이지 리로드 후에도 유지
    await page.reload();
    await page.waitForTimeout(1500);

    const tzSelectAfterReload = page.locator('select').filter({ has: page.locator('optgroup[label="한국"]') }).first();
    await expect(tzSelectAfterReload).toHaveValue('America/New_York');
  });
  // REQ-TZ-006
  test('코드 생성 POST 요청에 timezone 변환된 UTC 값이 전송됨', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem('admin_preferred_timezone'));
    let postBody: { expiresAt?: string; studentName?: string } = {};

    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'POST') {
        postBody = route.request().postDataJSON() as typeof postBody;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ token: '999888', warning: null }),
        });
      } else if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [] }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    // 학생명 입력
    await page.fill('input[placeholder="예: 홍길동"]', '타임존테스트');

    // 시간대를 America/Los_Angeles 로 변경
    const tzSelect = page.locator('select').filter({ has: page.locator('optgroup[label="한국"]') }).first();
    await tzSelect.selectOption('America/Los_Angeles');

    // 만료 일시 입력: 2027-07-15T09:00 (LA 로컬)
    // localToUTC('2027-07-15T09:00', 'America/Los_Angeles') = '2027-07-15T16:00:00.000Z' (PDT=UTC-7)
    const expiryInput = page.locator('input[type="datetime-local"]').first();
    await expiryInput.fill('2027-07-15T09:00');

    // 폼 제출
    await page.getByRole('button', { name: '코드 생성' }).click();
    await page.waitForTimeout(800);

    // POST body의 expiresAt이 UTC로 변환됐는지 확인
    expect(postBody.expiresAt).toBe('2027-07-15T16:00:00.000Z');
    expect(postBody.studentName).toBe('타임존테스트');
  });
});

// ──────────────────────────────────────────────────────────────
// Suite: 에러 처리
// ──────────────────────────────────────────────────────────────

test.describe('토큰 관리 — 에러 처리', () => {
  test.beforeEach(async ({ page }) => {
    await setAdminAuth(page);
    await mockSupportApis(page);
  });

  test('삭제 API 실패 시 에러 메시지 표시됨', async ({ page }) => {
    await page.route(/\/api\/admin\/diagnosis\/tokens\/[^/?]+/, (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: '시험 결과가 있는 코드는 삭제할 수 없습니다.' }),
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

    page.once('dialog', (dialog) => dialog.accept());

    const pendingRow = page.locator('tr', { has: page.getByText('테스트학생') });
    await pendingRow.getByRole('button', { name: '삭제' }).click();

    await page.waitForTimeout(800);

    // 에러 메시지가 표 위에 표시됨
    await expect(page.getByText('시험 결과가 있는 코드는 삭제할 수 없습니다.')).toBeVisible();
  });

  // REQ-MSG-001
  test('만료일시 수정 API 실패 시 에러 메시지 표시됨', async ({ page }) => {
    await page.route(/\/api\/admin\/diagnosis\/tokens\/[^/?]+/, (route) => {
      if (route.request().method() === 'PATCH') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: '유효하지 않은 날짜 형식입니다.' }),
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

    const pendingRow = page.locator('tr', { has: page.getByText('테스트학생') });
    const expiryCell = pendingRow.locator('td').nth(3);
    await expiryCell.locator('button').first().click();

    const dateInput = expiryCell.locator('input[type="datetime-local"]');
    await expect(dateInput).toBeVisible();

    await dateInput.fill('2027-06-30T12:00');
    await expiryCell.getByRole('button', { name: '저장' }).click();

    await page.waitForTimeout(800);

    // 에러 메시지 표시, 편집 모드 유지
    await expect(page.getByText('유효하지 않은 날짜 형식입니다.')).toBeVisible();
  });
});

// ──────────────────────────────────────────────────────────────
// Suite: 메시지 템플릿 시간대 검증
// KO/EN 메시지 모두 선택된 학생 시간대를 반영해야 함
// ──────────────────────────────────────────────────────────────

test.describe('토큰 관리 — 메시지 템플릿 시간대', () => {
  // 2027-07-15T16:00:00.000Z = PDT(UTC-7) 기준 09:00
  const MOCK_EXPIRES_AT_UTC = '2027-07-15T16:00:00.000Z';

  async function mockAndGenerate(page: Page, timezone: string) {
    await setAdminAuth(page);
    await page.addInitScript(() => sessionStorage.removeItem('admin_preferred_timezone'));
    await mockSupportApis(page);

    await page.route(/\/api\/admin\/diagnosis\/tokens(\?.*)?$/, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ code: '123456', studentName: '시간대학생', expiresAt: MOCK_EXPIRES_AT_UTC, warning: null }),
        });
      } else if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ codes: [] }) });
      } else {
        route.continue();
      }
    });

    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);

    await page.fill('input[placeholder="예: 홍길동"]', '시간대학생');

    const tzSelect = page.locator('select').filter({ has: page.locator('optgroup[label="한국"]') }).first();
    await tzSelect.selectOption(timezone);

    await page.getByRole('button', { name: '코드 생성' }).click();
    await page.waitForTimeout(1000);
  }

  // REQ-TZ-MSG-001
  test('KO 메시지: 미국 태평양(LA) 시간대 선택 시 한국어 메시지에 PT 기준 시간 표시', async ({ page }) => {
    await mockAndGenerate(page, 'America/Los_Angeles');

    // 한국어 탭이 기본 활성화
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    const koText = await textarea.inputValue();

    // 태평양 시간 레이블이 한국어 메시지에 포함되어야 함
    expect(koText).toContain('태평양 시간 (PT)');
    // 한국 표준시가 아니어야 함
    expect(koText).not.toContain('한국 표준시');
    // ko-KR 로케일은 GMT 오프셋 표기 사용 (PDT 대신 GMT-7)
    // UTC 16:00 = PDT(UTC-7) 기준 오전 09:00 임을 확인
    expect(koText).toContain('09:00');
    expect(koText).toContain('GMT-7');
  });

  // REQ-TZ-MSG-002
  test('EN 메시지: 미국 태평양(LA) 시간대 선택 시 영어 메시지에 미국 시간 표시', async ({ page }) => {
    await mockAndGenerate(page, 'America/Los_Angeles');

    // EN 탭으로 전환
    await page.getByRole('button', { name: 'English' }).click();

    const textarea = page.locator('textarea');
    const enText = await textarea.inputValue();

    expect(enText).toContain('미국');
    expect(enText).toMatch(/PDT|PST/);
  });

  // REQ-TZ-MSG-003
  test('KO 메시지: 한국(Seoul) 시간대 선택 시 한국 표준시 표시', async ({ page }) => {
    await mockAndGenerate(page, 'Asia/Seoul');

    const textarea = page.locator('textarea');
    const koText = await textarea.inputValue();

    expect(koText).toContain('한국 표준시');
    // ko-KR 로케일은 KST 대신 GMT+9 표기
    // UTC 16:00 = KST(UTC+9) 기준 다음날 01:00
    expect(koText).toContain('GMT+9');
  });

  // REQ-TZ-MSG-004
  test('KO 메시지: 미국 동부(NY) 시간대 선택 시 동부 시간 레이블 표시', async ({ page }) => {
    await mockAndGenerate(page, 'America/New_York');

    const textarea = page.locator('textarea');
    const koText = await textarea.inputValue();

    expect(koText).toContain('동부 시간 (ET)');
    expect(koText).not.toContain('한국 표준시');
    // ko-KR 로케일은 EDT 대신 GMT-4 표기 (2027-07-15 EDT = UTC-4)
    // UTC 16:00 = EDT(UTC-4) 기준 오후 12:00
    expect(koText).toContain('GMT-4');
  });
});
