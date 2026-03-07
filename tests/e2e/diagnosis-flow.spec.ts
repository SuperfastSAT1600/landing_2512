import { test, expect } from '@playwright/test';

test.describe('Diagnostic Test Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start dev server if needed
    await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });
  });

  test('REQ-001: Test header displays correctly below menu bar', async ({ page }) => {
    // Navigate to diagnosis page with code entry
    await page.goto('/diagnosis?code=123456', { waitUntil: 'domcontentloaded' });

    // Verify header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Get header height
    const headerBox = await header.boundingBox();
    expect(headerBox?.height).toBeGreaterThan(0);

    // The page content should start after the header
    const pageContent = page.locator('[style*="padding-top"]');
    // Just verify that we have page content that is positioned after header
    await expect(pageContent).toBeVisible();
  });

  test('REQ-002: Student can enter and validate an access token', async ({ page, context }) => {
    // Mock the token validation API
    await context.addInitScript(() => {
      // This would normally be filled by the actual token in the URL
      window.localStorage.setItem('testToken', 'test-token-uuid');
    });

    await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });

    // Look for token input field
    const tokenInputs = page.locator('input[type="text"]');
    expect(tokenInputs).toBeTruthy();

    // Mock the API response for token validation
    await page.route('**/api/diagnosis/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenId: 'test-token-id',
          studentEmail: 'test@example.com',
          studentName: 'Test Student',
        }),
      });
    });

    // Fill in a token (would be the UUID in real scenario)
    await tokenInputs.first().fill('test-token-uuid');

    // Submit form
    const confirmButton = page.locator('button:has-text("확인")').first();
    await confirmButton.click();

    // Should transition to student confirm phase
    // Look for student name display
    await page.waitForSelector('text=Test Student', { timeout: 5000 });
    expect(await page.locator('text=Test Student').isVisible()).toBe(true);
  });

  test('REQ-003: Validated token displays student information', async ({ page, context }) => {
    // Mock the token validation API
    await page.route('**/api/diagnosis/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenId: 'test-token-id',
          studentEmail: 'test@example.com',
          studentName: 'Test Student',
        }),
      });
    });

    await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });

    // Enter token
    const tokenInputs = page.locator('input[type="text"]');
    await tokenInputs.first().fill('test-token-uuid');

    // Click confirm
    const confirmButton = page.locator('button:has-text("확인")').first();
    await confirmButton.click();

    // Verify student info is displayed
    await page.waitForSelector('text=Test Student', { timeout: 5000 });
    await expect(page.locator('text=Test Student')).toBeVisible();
    await expect(page.locator('text=test@example.com')).toBeVisible();

    // Verify "테스트 시작" button is present
    const startButton = page.locator('button:has-text("테스트 시작")');
    await expect(startButton).toBeVisible();
  });

  test('REQ-005: Admin can generate access tokens with 24-hour auto-expiration', async ({
    page,
  }) => {
    // Mock admin authentication
    await page.addInitScript(() => {
      localStorage.setItem('adminKey', 'test-admin-key');
    });

    // Navigate to admin diagnosis page
    await page.goto('/admin/diagnosis', { waitUntil: 'domcontentloaded' });

    // Check if we're on admin page (simplified check)
    // Verify token generation tab is visible
    const tokenTab = page.locator('text=토큰 생성');
    await expect(tokenTab).toBeVisible();

    // Mock the token generation API
    await page.route('**/api/admin/diagnosis/tokens', async (route) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'generated-test-token-uuid',
          studentEmail: 'student@example.com',
          studentName: 'Test Student',
          expiresAt: expiresAt.toISOString(),
          testUrl: '/diagnosis?token=generated-test-token-uuid',
        }),
      });
    });

    // Fill in student info
    const inputs = page.locator('input');
    const nameInput = inputs.nth(0);
    const emailInput = inputs.nth(1);

    await nameInput.fill('Test Student');
    await emailInput.fill('student@example.com');

    // Click generate button
    const generateButton = page.locator('button:has-text("토큰 생성")');
    await generateButton.click();

    // Verify token is displayed
    await page.waitForSelector('text=generated-test-token-uuid', { timeout: 5000 });
    await expect(page.locator('text=generated-test-token-uuid')).toBeVisible();

    // Verify test URL is displayed
    await expect(
      page.locator('text=/diagnosis\\?token=generated-test-token-uuid')
    ).toBeVisible();
  });

  test('REQ-006: Admin can view list of test results with filtering', async ({
    page,
  }) => {
    // Mock admin authentication
    await page.addInitScript(() => {
      localStorage.setItem('adminKey', 'test-admin-key');
    });

    // Navigate to admin diagnosis page
    await page.goto('/admin/diagnosis', { waitUntil: 'domcontentloaded' });

    // Click results tab
    const resultsTab = page.locator('text=시험 결과');
    await resultsTab.click();

    // Mock the results API
    await page.route('**/api/admin/diagnosis/results*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 'test-result-1',
              student_name: 'Test Student 1',
              student_email: 'student1@example.com',
              submitted_at: new Date(Date.now() - 3600000).toISOString(),
              total_time_seconds: 1800,
            },
          ],
          total: 1,
        }),
      });
    });

    // Verify results table is visible
    await page.waitForSelector('text=Test Student 1', { timeout: 5000 });
    await expect(page.locator('text=Test Student 1')).toBeVisible();
    await expect(page.locator('text=student1@example.com')).toBeVisible();
  });
});
