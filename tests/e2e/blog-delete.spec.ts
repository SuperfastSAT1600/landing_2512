/**
 * Blog Post Delete E2E Tests
 *
 * REQ-002: 삭제 성공 → 목록에서 포스트 사라짐
 * REQ-003: 삭제 취소 → DELETE 미호출 & 목록 유지
 * REQ-004: DELETE 500 오류 → "삭제 실패" 얼럿 표시
 * REQ-005: 삭제 버튼 hover 시에만 노출
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN_KEY = 'test-admin-key';

const MOCK_POSTS = [
  { id: 'post-1', title: '삭제 테스트 포스트', date: '2026-03-20', category: 'SAT Tips', status: 'published' },
  { id: 'post-2', title: '남겨둘 포스트', date: '2026-03-19', category: 'Grammar', status: 'draft' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function gotoAdminPosts(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem('admin_key', key);
  }, ADMIN_KEY);
  await page.goto('/admin');
  // Wait for posts table header to confirm the list has rendered
  await page.waitForSelector('text=Title', { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Blog Post Delete', () => {

  test('REQ-002: delete post removes it from the list', async ({ page }) => {
    // Use a state variable instead of a counter to handle React StrictMode's
    // double-invoke of useEffect in development mode without side effects.
    let afterDelete = false;

    await page.route('**/api/admin/posts', async (route) => {
      if (route.request().method() === 'GET') {
        const posts = afterDelete ? [MOCK_POSTS[1]] : MOCK_POSTS;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, posts }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/admin/posts?id=post-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        afterDelete = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    page.on('dialog', (dialog) => dialog.accept());

    await gotoAdminPosts(page);

    // Both posts should be visible initially
    await expect(page.getByText('삭제 테스트 포스트')).toBeVisible();
    await expect(page.getByText('남겨둘 포스트')).toBeVisible();

    // Hover to reveal delete button (opacity-0 → opacity-100)
    await page.getByText('삭제 테스트 포스트').hover();
    await page.locator('[title="Delete"]').first().click();

    // After list refresh, deleted post should be gone
    await expect(page.getByText('삭제 테스트 포스트')).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('남겨둘 포스트')).toBeVisible();
  });

  test('REQ-003: canceling delete keeps post in the list', async ({ page }) => {
    await page.route('**/api/admin/posts', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, posts: MOCK_POSTS }),
        });
      } else {
        await route.continue();
      }
    });

    let deleteCallCount = 0;
    await page.route('**/api/admin/posts?id=post-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCallCount++;
        await route.continue();
      } else {
        await route.continue();
      }
    });

    // Dismiss the confirm dialog (cancel delete)
    page.on('dialog', (dialog) => dialog.dismiss());

    await gotoAdminPosts(page);

    await expect(page.getByText('삭제 테스트 포스트')).toBeVisible();

    await page.getByText('삭제 테스트 포스트').hover();
    await page.locator('[title="Delete"]').first().click();

    // DELETE should NOT have been called
    expect(deleteCallCount).toBe(0);

    // Both posts still in list
    await expect(page.getByText('삭제 테스트 포스트')).toBeVisible();
    await expect(page.getByText('남겨둘 포스트')).toBeVisible();
  });

  test('REQ-004: DELETE 500 error shows 삭제 실패 alert', async ({ page }) => {
    await page.route('**/api/admin/posts', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, posts: MOCK_POSTS }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/admin/posts?id=post-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Server error' }),
        });
      } else {
        await route.continue();
      }
    });

    const alertMessages: string[] = [];
    page.on('dialog', (dialog) => {
      if (dialog.type() === 'confirm') {
        dialog.accept();
      } else {
        alertMessages.push(dialog.message());
        dialog.accept();
      }
    });

    await gotoAdminPosts(page);
    await page.getByText('삭제 테스트 포스트').hover();
    await page.locator('[title="Delete"]').first().click();

    // Wait for alert to fire
    await page.waitForFunction(() => true, null, { timeout: 3_000 }).catch(() => null);
    expect(alertMessages).toContain('삭제 실패');

    // Post still in list (delete failed, no fetchPosts re-called)
    await expect(page.getByText('삭제 테스트 포스트')).toBeVisible({ timeout: 3_000 });
  });

  test('REQ-005: delete button is hidden by default and visible on hover', async ({ page }) => {
    await page.route('**/api/admin/posts', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, posts: MOCK_POSTS }),
        });
      } else {
        await route.continue();
      }
    });

    await gotoAdminPosts(page);
    await expect(page.getByText('삭제 테스트 포스트')).toBeVisible();

    // Locate the row that contains "삭제 테스트 포스트"
    const row = page.locator('.group').filter({ hasText: '삭제 테스트 포스트' });

    // The actions container uses Tailwind `opacity-0 group-hover:opacity-100`.
    // Playwright's toBeVisible() ignores opacity, so we check computed style directly.
    const actionsDiv = row.locator('.opacity-0').first();

    // Before hover: computed opacity should be 0
    const opacityBefore = await actionsDiv.evaluate(
      (el) => window.getComputedStyle(el).opacity
    );
    expect(opacityBefore).toBe('0');

    // After hover: wait for transition-opacity to reach 1
    await row.hover();
    await expect.poll(
      () => actionsDiv.evaluate((el) => window.getComputedStyle(el).opacity),
      { timeout: 2_000 }
    ).toBe('1');
  });

});
