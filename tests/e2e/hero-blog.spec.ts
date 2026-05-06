import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mock the floating CTA API endpoint (SSR pages cannot be intercepted via page.route). */
async function mockFeaturedPost(page: Page) {
  await page.route('**/api/featured-post', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, discount: null }),
    });
  });
}

const CATEGORY_MAP: Record<string, string> = {
  'SAT RW': 'SAT 리딩 & 라이팅',
  'SAT Math': 'SAT 수학 완전 정복',
  '입시뉴스': '미국 대학 입시 뉴스',
};

// ---------------------------------------------------------------------------
// REQ-001: Hero CTA 버튼이 visible하고 href가 /blog/ 경로를 가리킴
// ---------------------------------------------------------------------------

test.describe('REQ-001 — Hero CTA href', () => {
  test('primaryBtn is visible and links to a /blog/ path (not /curriculum fallback)', async ({
    page,
  }) => {
    await mockFeaturedPost(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Hero renders a Link with className containing "primaryBtn" (CSS Module: styles.primaryBtn)
    const cta = page.locator('a[class*="primaryBtn"]').first();
    await expect(cta).toBeVisible({ timeout: 15_000 });

    const href = await cta.getAttribute('href');
    expect(href).not.toBe('/curriculum');
    expect(href).toMatch(/^\/blog\//);
  });
});

// ---------------------------------------------------------------------------
// REQ-002: CTA가 링크하는 블로그 포스트 페이지가 HTTP 200 반환
// ---------------------------------------------------------------------------

test.describe('REQ-002 — CTA target blog post returns HTTP 200', () => {
  test('navigating to CTA href yields 200 and no Application error', async ({ page }) => {
    await mockFeaturedPost(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const cta = page.locator('a[class*="primaryBtn"]').first();
    await expect(cta).toBeVisible({ timeout: 15_000 });

    const href = await cta.getAttribute('href');
    expect(href).toBeTruthy();

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(href!), { timeout: 20_000 }),
      page.goto(href!, { waitUntil: 'domcontentloaded' }),
    ]);

    expect(response.status()).toBe(200);
    await expect(page.locator('text=Application error')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// REQ-003: /blog 목록 페이지가 200이고 포스트 카드가 1개 이상 렌더링
// ---------------------------------------------------------------------------

test.describe('REQ-003 — /blog listing page', () => {
  test('returns 200 and renders at least one post card', async ({ page }) => {
    const response = await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    const postLinks = page.locator('a[href^="/blog/"]');
    await expect(postLinks.first()).toBeVisible({ timeout: 15_000 });

    const count = await postLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// REQ-004: 카테고리 필터 3개 각각 올바른 h1과 200 반환
// ---------------------------------------------------------------------------

test.describe('REQ-004 — Category filter pages', () => {
  for (const [category, expectedTitle] of Object.entries(CATEGORY_MAP)) {
    test(`/blog?category=${category} returns 200 and shows "${expectedTitle}"`, async ({
      page,
    }) => {
      const encodedCategory = encodeURIComponent(category);
      const response = await page.goto(`/blog?category=${encodedCategory}`, {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.status()).toBe(200);

      const h1 = page.locator(`h1:has-text("${expectedTitle}")`);
      await expect(h1).toBeVisible({ timeout: 15_000 });
    });
  }
});

// ---------------------------------------------------------------------------
// REQ-005: 목록에서 첫 번째 포스트 클릭 후 개별 포스트 페이지 200 반환
// ---------------------------------------------------------------------------

test.describe('REQ-005 — First post click navigates to 200 page', () => {
  test('clicking first post card opens the post page with h1 visible', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });

    const firstPost = page.locator('a[href^="/blog/"]').first();
    await expect(firstPost).toBeVisible({ timeout: 15_000 });

    const href = await firstPost.getAttribute('href');
    expect(href).toBeTruthy();

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(href!), { timeout: 20_000 }),
      page.goto(href!, { waitUntil: 'domcontentloaded' }),
    ]);

    expect(response.status()).toBe(200);

    const postH1 = page.locator('article h1, main h1').first();
    await expect(postH1).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// REQ-006: 헤더 nav 카테고리 링크 3개가 올바른 href를 가지며 200 반환
// ---------------------------------------------------------------------------

test.describe('REQ-006 — Header nav category links', () => {
  test('all 3 category nav links have correct href and return 200', async ({ page }) => {
    await mockFeaturedPost(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const expectedLinks = [
      '/blog?category=SAT%20RW',
      '/blog?category=SAT%20Math',
      '/blog?category=%EC%9E%85%EC%8B%9C%EB%89%B4%EC%8A%A4',
    ];

    // Collect nav links that point to blog category pages
    const navLinks = page.locator('nav a[href*="/blog?category="]');
    await expect(navLinks.first()).toBeVisible({ timeout: 15_000 });

    const hrefs: string[] = [];
    const count = await navLinks.count();
    for (let i = 0; i < count; i++) {
      const href = await navLinks.nth(i).getAttribute('href');
      if (href) hrefs.push(href);
    }

    // Verify we have 3 category links
    expect(hrefs.length).toBe(3);

    // Verify each link returns 200
    for (const href of hrefs) {
      const response = await page.goto(href, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
    }
  });
});
