import { test, expect } from '@playwright/test';

// Helper: fill the 6-digit code inputs.
// Click each individual input and type the digit — avoids relying on React's
// auto-advance behavior which can be unreliable in Playwright's event dispatch.
async function fillCode(page: import('@playwright/test').Page, code: string) {
  for (let i = 0; i < code.length; i++) {
    const input = page.locator(`input[aria-label="Code digit ${i + 1}"]`);
    await input.click();
    await input.pressSequentially(code[i], { delay: 30 });
  }
}

test.describe('Diagnostic Test Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });
  });

  test('REQ-001: Code-entry page loads and shows the input prompt', async ({ page }) => {
    // The diagnosis page shows a 6-digit code entry form (no traditional <header>)
    await expect(page.locator('text=접속 코드를 입력하세요')).toBeVisible();
    await expect(page.locator('text=문자로 받은 6자리 코드를 입력해주세요')).toBeVisible();
    // 6 individual digit inputs
    for (let i = 1; i <= 6; i++) {
      await expect(page.locator(`input[aria-label="Code digit ${i}"]`)).toBeVisible();
    }
    await expect(page.locator('button:has-text("확인")')).toBeVisible();
  });

  test('REQ-002: Student can enter and validate an access token', async ({ page }) => {
    // Set up the API mock BEFORE interacting with the form
    await page.route('**/api/diagnosis/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenId: 'test-token-id',
          studentName: 'Test Student',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          testVersionId: null,
        }),
      });
    });

    await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });

    // Fill 6 numeric digits one by one
    await fillCode(page, '123456');

    // Verify confirm button is enabled, then click
    const confirmButton = page.locator('button:has-text("확인")');
    await expect(confirmButton).not.toBeDisabled();
    await confirmButton.click();

    // Should transition to student confirm phase — name is visible
    await expect(page.locator('text=Test Student')).toBeVisible({ timeout: 5000 });
  });

  test('REQ-003: Validated token displays student name only (no email on confirm screen)', async ({ page }) => {
    await page.route('**/api/diagnosis/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenId: 'test-token-id',
          studentName: 'Test Student',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          testVersionId: null,
        }),
      });
    });

    await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });
    await fillCode(page, '123456');
    await page.locator('button:has-text("확인")').click();

    // Confirm screen shows name and validity period — NOT email
    await expect(page.locator('text=Test Student')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Confirm Your Identity')).toBeVisible();

    // Email must NOT be displayed on the confirm screen (email is collected after)
    await expect(page.locator('text=test@example.com')).not.toBeVisible();

    // Continue button leads to email-input phase
    const continueButton = page.locator("button:has-text(\"That's me\")");
    await expect(continueButton).toBeVisible();
  });

  test('REQ-004: Email input phase appears after identity confirmation', async ({ page }) => {
    await page.route('**/api/diagnosis/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenId: 'test-token-id',
          studentName: 'Test Student',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          testVersionId: null,
        }),
      });
    });

    await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });
    await fillCode(page, '123456');
    await page.locator('button:has-text("확인")').click();
    await expect(page.locator('text=Test Student')).toBeVisible({ timeout: 5000 });

    // Click the identity confirmation button
    await page.locator("button:has-text(\"That's me\")").click();

    // Should now show the email input phase
    await expect(page.locator('text=Enter Your Email')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('REQ-004: Email validation prevents empty and invalid emails', async ({ page }) => {
    await page.route('**/api/diagnosis/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenId: 'test-token-id',
          studentName: 'Test Student',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          testVersionId: null,
        }),
      });
    });

    await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });
    await fillCode(page, '123456');
    await page.locator('button:has-text("확인")').click();
    await expect(page.locator('text=Test Student')).toBeVisible({ timeout: 5000 });
    await page.locator("button:has-text(\"That's me\")").click();
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });

    // Empty submit shows error
    await page.locator('button:has-text("Continue")').click();
    await expect(page.locator('text=Please enter your email address.')).toBeVisible();

    // Invalid email shows error
    await page.locator('input[type="email"]').fill('not-an-email');
    await page.locator('button:has-text("Continue")').click();
    await expect(page.locator('text=Please enter a valid email address.')).toBeVisible();
  });

  test('REQ-005: Admin can generate access tokens (name only, no email field)', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('adminKey', 'test-admin-key');
    });

    // Mock all token-related requests BEFORE navigating
    await page.route('**/api/admin/diagnosis/tokens*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [], total: 0 }),
        });
      } else {
        // POST — token created successfully
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            studentName: 'Test Student',
            code: '123456',
            expiresAt: expiresAt.toISOString(),
          }),
        });
      }
    });

    await page.goto('/admin/diagnosis', { waitUntil: 'domcontentloaded' });

    // Tab is now "코드 관리" (was "토큰 생성")
    await expect(page.locator('text=코드 관리')).toBeVisible();

    // Admin form only has student NAME input — no email field
    const nameInput = page.locator('input[placeholder="예: 홍길동"]');
    await nameInput.fill('Test Student');

    // Confirm no email input exists on this form
    await expect(page.locator('input[type="email"]')).toHaveCount(0);

    // Submit — button should not be disabled
    const generateButton = page.locator('button:has-text("코드 생성")');
    await expect(generateButton).not.toBeDisabled();
    await generateButton.click();

    // After success, the form resets (student name input is cleared)
    await expect(nameInput).toHaveValue('', { timeout: 5000 });
  });

  test('REQ-006: Admin can view list of test results', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('adminKey', 'test-admin-key');
    });

    // Mock BEFORE navigating so the initial data fetch is intercepted
    await page.route('**/api/admin/diagnosis/results*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 'test-result-1',
              student_name: 'Test Student 1',
              student_email: null,
              submitted_at: new Date(Date.now() - 3600000).toISOString(),
              total_time_seconds: 1800,
            },
          ],
          total: 1,
        }),
      });
    });

    await page.goto('/admin/diagnosis', { waitUntil: 'domcontentloaded' });

    // Click results tab — mock is already in place
    await page.locator('text=시험 결과').click();

    await expect(page.locator('text=Test Student 1')).toBeVisible({ timeout: 5000 });
    // student_email is now nullable — do NOT assert email column presence
  });
});
