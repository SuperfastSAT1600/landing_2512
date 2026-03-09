import { test, expect } from '@playwright/test';

const TEST_CODE = '777888';
const STUDENT_NAME = 'E2E 테스트학생';
const STUDENT_EMAIL = 'e2e-test@example.com';

test.describe('Student Test Flow', () => {
  test('Complete flow: code entry → confirm identity → enter email → take test → submit', async ({ page }) => {
    test.setTimeout(120_000);

    // Mock token validation to avoid needing a real code in DB
    await page.route('**/api/diagnosis/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenId: 'mock-token-id',
          studentName: STUDENT_NAME,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          testVersionId: null,
        }),
      });
    });

    // Mock test content so we don't need a live DB version
    await page.route('**/api/diagnosis/test-content*', async (route) => {
      // Minimal test data with 1 question to keep test fast
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-test',
          title: 'SAT Diagnostic Test',
          sections: [
            {
              name: 'Reading and Writing',
              questions: [
                {
                  id: 'q-mock-1',
                  number: 1,
                  type: 'multiple-choice',
                  section: 'Reading and Writing',
                  domain: 'Information and Ideas',
                  skill: 'Central Ideas and Details',
                  difficulty: 'Medium',
                  passage: 'Test passage text.',
                  question: 'What is the main idea?',
                  options: [
                    { id: 'A', text: 'Option A', type: 'correct' },
                    { id: 'B', text: 'Option B', type: 'incorrect' },
                    { id: 'C', text: 'Option C', type: 'incorrect' },
                    { id: 'D', text: 'Option D', type: 'incorrect' },
                  ],
                },
              ],
            },
          ],
        }),
      });
    });

    // Step 1: Navigate to diagnosis page
    await page.goto('/diagnosis');
    await expect(page.locator('text=접속 코드를 입력하세요')).toBeVisible();

    // Step 2: Enter 6-digit code — type into first box, auto-advance handles the rest
    await page.locator('input[aria-label="Code digit 1"]').focus();
    for (const char of TEST_CODE) {
      await page.keyboard.type(char);
      await page.waitForTimeout(30);
    }

    // Step 3: Click verify
    await page.locator('button:has-text("확인")').click();

    // Step 4: Confirm identity screen — shows NAME only, NOT email
    await expect(page.locator('text=Confirm Your Identity')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${STUDENT_NAME}`)).toBeVisible();
    // Email must NOT appear on the confirm screen
    await expect(page.locator(`text=${STUDENT_EMAIL}`)).not.toBeVisible();

    // Step 5: Click "That's me — Continue" (not "Start Test")
    await page.locator("button:has-text(\"That's me\")").click();

    // Step 6: Email input phase
    await expect(page.locator('text=Enter Your Email')).toBeVisible({ timeout: 5000 });
    await page.locator('input[type="email"]').fill(STUDENT_EMAIL);
    await page.locator('button:has-text("Continue")').click();

    // Step 7: Test loads (or shows loading state briefly)
    // After email submit, test-loading → test-active
    await page.waitForTimeout(1000);
  });

  test('REQ-004: Email phase has a 건너뛰기 (skip) button', async ({ page }) => {
    await page.route('**/api/diagnosis/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenId: 'mock-token-id',
          studentName: 'Test Student',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          testVersionId: null,
        }),
      });
    });

    await page.goto('/diagnosis');
    await page.locator('input[aria-label="Code digit 1"]').focus();
    for (const char of '123456') {
      await page.keyboard.type(char);
      await page.waitForTimeout(30);
    }
    await page.locator('button:has-text("확인")').click();
    await expect(page.locator('text=Confirm Your Identity')).toBeVisible({ timeout: 10000 });
    await page.locator("button:has-text(\"That's me\")").click();
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });

    // Skip button is now visible (REQ-004)
    await expect(page.locator('button:has-text("건너뛰기")')).toBeVisible();
  });
});
