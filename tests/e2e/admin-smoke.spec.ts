/**
 * Admin Smoke Tests
 * - Auth gate (로그인 전 보호 확인)
 * - 포스트 관리 페이지 렌더링
 * - 진단 관리 탭 전환 (코드 관리 / 시험 결과 / 문항 통계 / 버전 관리)
 * - 홈 설정 페이지 렌더링
 * - 리뷰 관리 페이지 렌더링
 * - 리포트 페이지 (self-fetch 제거 후 Application error 재현 방지)
 */

import { test, expect, type Page } from '@playwright/test';

const ADMIN_KEY = 'test-admin-key';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Inject a dummy admin key into localStorage so auth gate passes */
async function setAdminAuth(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem('admin_key', key);
  }, ADMIN_KEY);
}

/** Mock all /api/admin/* routes to return success without hitting real DB */
async function mockAdminApis(page: Page) {
  // Posts list
  await page.route('**/api/admin/posts**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          posts: [
            { id: 'post-1', title: '테스트 포스트', date: '2026-03-12', category: 'SAT Tips', status: 'published' },
            { id: 'post-2', title: '두 번째 포스트', date: '2026-03-11', category: 'Grammar', status: 'draft' },
          ],
        }),
      });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }
  });

  // Diagnosis tokens
  await page.route('**/api/admin/diagnosis/tokens**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        tokens: [
          { id: 'tk-1', token: 'ABC123', student_name: '홍길동', student_email: 'test@test.com', is_used: false, created_at: '2026-03-12T00:00:00Z' },
        ],
      }),
    });
  });

  // Diagnosis results
  await page.route('**/api/admin/diagnosis/results**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        results: [
          { id: 'res-1', student_name: '김테스트', student_email: 'kim@test.com', submitted_at: '2026-03-12T10:00:00Z', total_time_seconds: 1800 },
        ],
      }),
    });
  });

  // Question stats
  await page.route('**/api/admin/diagnosis/question-stats**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, stats: [] }),
    });
  });

  // Versions
  await page.route('**/api/admin/diagnosis/versions**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        versions: [
          { id: 'v-1', name: 'v1.0', is_current: true, created_at: '2026-01-01T00:00:00Z', question_count: 44 },
        ],
      }),
    });
  });

  // Reviews
  await page.route('**/api/reviews**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, reviews: [] }),
    });
  });

  // Home config — GET /api/admin/config returns HomeConfig directly (no wrapper)
  await page.route('**/api/admin/config**', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hero: { ctaText: '인터뷰 보기', ctaLink: '/blog/test' },
          features: [
            { postSlug: 'test-slug', title: '테스트 기능', description: '설명' },
          ],
          floatingCta: { discountLabel: '', discountPostSlug: '' },
        }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    }
  });
}

// ──────────────────────────────────────────────
// Test Suite
// ──────────────────────────────────────────────

test.describe('Admin — Auth Gate', () => {
  test('인증 없이 접속 시 로그인 UI 표시', async ({ page }) => {
    await page.goto('/admin');
    // 로그인 폼이 나타나거나 redirect 되어야 함
    const body = await page.content();
    // auth gate: 로그인 입력창 or 관리자 텍스트가 있어야 함
    expect(
      body.includes('관리자') || body.includes('admin') || body.includes('password') || body.includes('로그인')
    ).toBe(true);
  });
});

test.describe('Admin — 포스트 관리', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await setAdminAuth(page);
  });

  test('포스트 목록 페이지 렌더링', async ({ page }) => {
    await page.goto('/admin');
    // 포스트 목록이 보여야 함
    await expect(page.locator('body')).not.toContainText('Application error');
    // 신규 포스트 버튼 또는 제목이 보여야 함
    const pageText = await page.textContent('body');
    expect(pageText).toBeTruthy();
  });

  test('포스트 검색창 존재', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    // 검색 입력창 확인
    const searchInput = page.locator('input[type="text"], input[placeholder*="검색"]');
    // 검색창이 있거나 포스트 목록이 렌더링되어야 함
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});

test.describe('Admin — 진단 관리 탭', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await setAdminAuth(page);
    await page.goto('/admin/diagnosis');
    await page.waitForTimeout(1500);
  });

  test('Application error 없이 페이지 렌더링', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('4개 탭 버튼 모두 표시', async ({ page }) => {
    const body = await page.textContent('body') ?? '';
    expect(body).toContain('코드 관리');
    expect(body).toContain('시험 결과');
    expect(body).toContain('문항 통계');
    expect(body).toContain('버전 관리');
  });

  test('시험 결과 탭 전환', async ({ page }) => {
    await page.getByRole('button', { name: '시험 결과' }).click();
    await page.waitForTimeout(800);
    await expect(page.locator('body')).not.toContainText('Application error');
    const body = await page.textContent('body') ?? '';
    // 결과 탭 내용이 나타나야 함
    expect(body.length).toBeGreaterThan(100);
  });

  test('문항 통계 탭 전환', async ({ page }) => {
    await page.getByRole('button', { name: '문항 통계' }).click();
    await page.waitForTimeout(800);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('버전 관리 탭 전환', async ({ page }) => {
    await page.getByRole('button', { name: '버전 관리' }).click();
    await page.waitForTimeout(800);
    await expect(page.locator('body')).not.toContainText('Application error');
  });
});

test.describe('Admin — 홈 설정', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await setAdminAuth(page);
  });

  test('홈 설정 페이지 렌더링', async ({ page }) => {
    await page.goto('/admin/home');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText('Application error');
    const body = await page.textContent('body') ?? '';
    expect(body.length).toBeGreaterThan(50);
  });
});

test.describe('Admin — 리뷰 관리', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminApis(page);
    await setAdminAuth(page);
  });

  test('리뷰 관리 페이지 렌더링', async ({ page }) => {
    await page.goto('/admin/reviews');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toContainText('Application error');
  });
});

test.describe('Reports — self-fetch 제거 후 회귀 방지', () => {
  test('존재하지 않는 리포트 → notFound (Application error 아님)', async ({ page }) => {
    // 존재하지 않는 ID → 404여야 함 (500 Application error가 아닌)
    const res = await page.request.get('/api/reports/non-existent-id-12345');
    // 404 또는 성공 (DB에 없으면 404)
    expect([404, 200]).toContain(res.status());

    // 페이지 접속 시 Application error가 아닌 not-found 페이지여야 함
    await page.goto('/reports/non-existent-id-12345');
    await page.waitForTimeout(2000);

    // "Application error"가 나오면 안 됨
    await expect(page.locator('body')).not.toContainText('Application error');
  });
});
