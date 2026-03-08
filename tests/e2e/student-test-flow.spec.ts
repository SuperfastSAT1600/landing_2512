import { test, expect } from '@playwright/test';

const TEST_CODE = '777888';
const STUDENT_NAME = 'E2E 테스트학생';
const STUDENT_EMAIL = 'e2e-test@example.com';

test.describe('Student Test Flow', () => {
  test('Complete flow: code entry → confirm → take test → submit', async ({ page }) => {
    test.setTimeout(120_000);

    // Step 1: Navigate to diagnosis page
    await page.goto('/diagnosis');
    await expect(page.locator('text=접속 코드를 입력하세요')).toBeVisible();

    // Step 2: Enter 6-digit code one digit at a time
    const digits = TEST_CODE.split('');
    for (let i = 0; i < digits.length; i++) {
      await page.locator(`input[aria-label="Code digit ${i + 1}"]`).fill(digits[i]);
    }

    // Step 3: Click verify
    await page.locator('button:has-text("확인")').click();

    // Step 4: Confirm student info
    await expect(page.locator('text=Confirm Your Information')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${STUDENT_NAME}`)).toBeVisible();
    await expect(page.locator(`text=${STUDENT_EMAIL}`)).toBeVisible();

    // Step 5: Click Start Test (confirm screen)
    await page.locator('button:has-text("Start Test")').click();

    // Step 6: Test intro screen
    await expect(page.locator('text=SAT Diagnostic Test')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("Start Test")').click();

    // Step 7: Now in the test — verify question 1
    await expect(page.locator('text=Question 1 of')).toBeVisible({ timeout: 10000 });

    // Step 8: Answer all 25 questions by clicking first option and Next
    for (let q = 0; q < 25; q++) {
      // Wait for question to load
      await expect(page.locator(`text=Question ${q + 1} of`)).toBeVisible({ timeout: 5000 });

      // Answer: click first option (multiple choice) or type answer (short answer)
      const mcOption = page.locator('.bluebook-option').first();
      const shortAnswer = page.locator('input.toss-input');

      if (await mcOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await mcOption.click();
      } else if (await shortAnswer.isVisible({ timeout: 500 }).catch(() => false)) {
        await shortAnswer.fill('42');
      }

      // Navigate: Next or Submit on last question
      if (q < 24) {
        await page.locator('button:has-text("Next")').click();
        await page.waitForTimeout(200);
      }
    }

    // Step 9: Submit on last question
    const submitBtn = page.locator('button:has-text("Submit")');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    // Step 10: Verify submitted — test UI should disappear
    // Wait for the submit to process
    await page.waitForTimeout(1000);

    // Should no longer show the test question interface
    await expect(page.locator('.bluebook-footer')).not.toBeVisible({ timeout: 10000 });
  });
});
