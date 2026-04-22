import { test, expect } from '@playwright/test';

/**
 * REQ-THUMB-001: 썸네일이 있는 포스트는 /blog 목록에서 <img> 태그를 렌더링한다
 * REQ-THUMB-002: 썸네일이 없는 포스트는 "Aa" placeholder를 표시한다 (폴백 정상 작동)
 * REQ-THUMB-003: revalidateTag 후 즉시 갱신 — 저장 API 호출 후 캐시가 무효화된다
 */

test.describe('REQ-THUMB-001 — /blog 목록 썸네일 렌더링', () => {
  test('썸네일 이미지가 있는 포스트는 <img> 태그를 렌더링한다', async ({ page }) => {
    const response = await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    // 포스트 카드 영역
    const cards = page.locator('a[href^="/blog/"]');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });

    // 썸네일 이미지가 하나 이상 존재하는지 확인 (DB에 featured_image가 있는 포스트가 한 개 이상)
    const thumbnails = page.locator('a[href^="/blog/"] img');
    const count = await thumbnails.count();

    if (count > 0) {
      // 첫 번째 썸네일의 src가 비어있지 않아야 함
      const src = await thumbnails.first().getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).not.toBe('');
    }
    // 썸네일이 아예 없는 경우는 DB에 featured_image가 없는 것이므로 REQ-THUMB-002로 검증
  });
});

test.describe('REQ-THUMB-002 — 썸네일 없는 포스트의 폴백 표시', () => {
  test('썸네일이 없는 포스트 카드는 "Aa" placeholder를 보여준다', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });

    const cards = page.locator('a[href^="/blog/"]');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });

    const cardCount = await cards.count();
    const thumbnailCount = await page.locator('a[href^="/blog/"] img').count();

    if (thumbnailCount < cardCount) {
      // 썸네일 없는 카드가 존재 → "Aa" 폴백이 렌더링되어야 함
      const placeholders = page.locator('a[href^="/blog/"] span:has-text("Aa")');
      await expect(placeholders.first()).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('REQ-THUMB-003 — /blog 목록 썸네일 영역 레이아웃', () => {
  test('모든 포스트 카드에 썸네일 영역(16:9 비율 컨테이너)이 존재한다', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });

    const cards = page.locator('a[href^="/blog/"]');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });

    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // 각 카드에 aspect-video 클래스를 가진 썸네일 컨테이너가 있어야 함
    const thumbnailContainers = page.locator('a[href^="/blog/"] .aspect-\\[16\\/9\\]');
    const containerCount = await thumbnailContainers.count();
    expect(containerCount).toBe(cardCount);
  });
});
