import { test, expect } from '@playwright/test';

test.describe('Vocabulary Tracking Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to diagnosis page and set up test environment
    await page.goto('/diagnosis');
  });

  test('REQ-001: Initial instruction notice appears on test start', async ({ page }) => {
    // Enter code
    await page.fill('input[inputmode="numeric"]', '1');
    await page.fill('input[inputmode="numeric"]:nth-of-type(2)', '2');
    await page.fill('input[inputmode="numeric"]:nth-of-type(3)', '3');
    await page.fill('input[inputmode="numeric"]:nth-of-type(4)', '4');
    await page.fill('input[inputmode="numeric"]:nth-of-type(5)', '5');
    await page.fill('input[inputmode="numeric"]:nth-of-type(6)', '6');

    await page.click('button:has-text("確認")');

    // Fill in student info
    await page.fill('input[placeholder="Enter your name"]', 'Test Student');
    await page.fill('input[placeholder="Enter your email"]', 'test@example.com');
    await page.click('button:has-text("Start Test")');

    // Check for vocabulary notice
    const notice = page.locator('text=Vocabulary Tip');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('Click any unknown word');
  });

  test('REQ-002: Word selection via click', async ({ page }) => {
    // Complete setup (abbreviated)
    await setupTest(page);

    // Wait for passage content
    const passage = page.locator('.test-passage-content');
    await expect(passage).toBeVisible();

    // Get the first word span
    const wordSpan = page.locator('.vocab-word-span').first();
    await wordSpan.click();

    // Check that Save button appears
    const saveButton = page.locator('.vocab-save-btn');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toContainText('Save');
  });

  test('REQ-003: Save word toggle adds dotted underline', async ({ page }) => {
    await setupTest(page);

    // Click a word
    const wordSpan = page.locator('.vocab-word-span').first();
    const wordText = await wordSpan.textContent();
    await wordSpan.click();

    // Click Save button
    const saveButton = page.locator('.vocab-save-btn');
    await saveButton.click();

    // Verify word now has dotted underline
    const savedWordSpan = page.locator('.vocab-saved').first();
    await expect(savedWordSpan).toHaveClass(/vocab-saved/);
  });

  test('REQ-003: Unsave button appears for saved words', async ({ page }) => {
    await setupTest(page);

    // Save a word
    const wordSpan = page.locator('.vocab-word-span').first();
    await wordSpan.click();
    let saveButton = page.locator('.vocab-save-btn');
    await saveButton.click();

    // Click the saved word again
    const savedWord = page.locator('.vocab-saved').first();
    await savedWord.click();

    // Verify button now says "Unsave"
    saveButton = page.locator('.vocab-save-btn');
    await expect(saveButton).toContainText('Unsave');
  });

  test('REQ-004: Saved words persist across question navigation', async ({ page }) => {
    await setupTest(page);

    // Save a word on question 1
    const wordSpan = page.locator('.vocab-word-span').first();
    await wordSpan.click();
    const saveButton = page.locator('.vocab-save-btn');
    await saveButton.click();

    // Navigate to next question
    await page.click('button:has-text("Next")');

    // Navigate back to question 1
    await page.click('button:has-text("Back")');

    // Verify saved word still has dotted underline
    const savedWord = page.locator('.vocab-saved').first();
    await expect(savedWord).toHaveClass(/vocab-saved/);
  });

  test('REQ-009: Word click does not trigger answer selection', async ({ page }) => {
    await setupTest(page);

    // Get first word in an option
    const optionText = page.locator('.bluebook-option-text').first();
    const wordInOption = optionText.locator('.vocab-word-span').first();

    // Click the word
    await wordInOption.click();

    // Verify Save button appeared but answer was not selected
    const saveButton = page.locator('.vocab-save-btn');
    await expect(saveButton).toBeVisible();

    // The option button should not be marked as selected
    const optionButton = page.locator('.bluebook-option.selected').first();
    // This should not exist since we only clicked a word, not selected answer
    const selectedOptions = await page.locator('.bluebook-option.selected').count();
    expect(selectedOptions).toBe(0);
  });

  test('REQ-009: Clicking option label still selects answer', async ({ page }) => {
    await setupTest(page);

    // Click on the option label/button area (not a word)
    const optionButton = page.locator('.bluebook-option').first();
    await optionButton.click();

    // Verify answer was selected
    const selectedOption = page.locator('.bluebook-option.selected').first();
    await expect(selectedOption).toBeVisible();
  });

  test('Should dismiss instruction notice', async ({ page }) => {
    await setupTestAndStartTest(page);

    // Find and click dismiss button
    const dismissButton = page.locator('.overflow-hidden >> button:has-text("✕")').first();
    await dismissButton.click();

    // Verify notice is gone
    const notice = page.locator('text=Vocabulary Tip');
    await expect(notice).not.toBeVisible();
  });

  test('Should save multiple words', async ({ page }) => {
    await setupTest(page);

    // Save first word
    let wordSpan = page.locator('.vocab-word-span').first();
    await wordSpan.click();
    let saveButton = page.locator('.vocab-save-btn');
    await saveButton.click();

    // Save second word
    wordSpan = page.locator('.vocab-word-span').nth(1);
    await wordSpan.click();
    saveButton = page.locator('.vocab-save-btn');
    await saveButton.click();

    // Verify both words have dotted underline
    const savedWords = page.locator('.vocab-saved');
    await expect(savedWords).toHaveCount(2);
  });
});

// Helper function to setup test and enter code
async function setupTest(page: any) {
  // This assumes code is "123456" for testing
  const inputs = page.locator('input[inputmode="numeric"]');
  for (let i = 0; i < 6; i++) {
    await inputs.nth(i).fill(String((i + 1) % 10));
  }

  await page.click('button:has-text("確認")');

  // Fill in student info
  await page.fill('input[placeholder="Enter your name"]', 'Test Student');
  await page.fill('input[placeholder="Enter your email"]', 'test@example.com');
  await page.click('button:has-text("Start Test")');

  // Wait for test to load
  await page.waitForSelector('.test-passage-content', { timeout: 5000 });
}

// Helper function for tests that need test started
async function setupTestAndStartTest(page: any) {
  await setupTest(page);
  // Already started in setupTest
}
