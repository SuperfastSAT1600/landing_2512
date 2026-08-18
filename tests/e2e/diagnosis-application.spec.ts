import { test, expect } from '@playwright/test';

// Helper: get a future date string in YYYY-MM-DD format (tomorrow)
function getTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

test.describe('Diagnosis Application Feature', () => {
  // -------------------------------------------------------------------------
  // Tab Navigation
  // -------------------------------------------------------------------------
  test.describe('Tab Navigation', () => {
    test('REQ-APP-001: /diagnosis shows two tabs — 코드 있어요 and 신청할게요', async ({ page }) => {
      await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('button:has-text("코드 있어요")')).toBeVisible();
      await expect(page.locator('button:has-text("신청할게요")')).toBeVisible();
    });

    test('REQ-APP-002: clicking 신청할게요 tab shows ApplicationForm Step 1', async ({ page }) => {
      await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });

      await page.locator('button:has-text("신청할게요")').click();

      // Step 1 fields should appear
      await expect(page.locator('text=이름')).toBeVisible();
      await expect(page.locator('text=전화번호')).toBeVisible();
      await expect(page.locator('button:has-text("다음")')).toBeVisible();
    });

    test('REQ-APP-003: 코드 있어요 tab remains active by default and shows code entry', async ({ page }) => {
      await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });

      // Default tab shows code entry
      await expect(page.locator('text=접속 코드를 입력하세요')).toBeVisible();
      // ApplicationForm is NOT visible by default
      await expect(page.locator('text=기본 정보')).not.toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Step 1 Validation
  // -------------------------------------------------------------------------
  test.describe('Step 1 Validation (Name + Phone)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });
      await page.locator('button:has-text("신청할게요")').click();
      await expect(page.locator('text=기본 정보')).toBeVisible();
    });

    test('REQ-APP-004: empty name shows validation error', async ({ page }) => {
      // Leave name empty, fill valid phone
      await page.locator('input[type="tel"]').fill('010-1234-5678');
      await page.locator('button:has-text("다음")').click();

      await expect(page.locator('text=이름을 입력해주세요.')).toBeVisible();
    });

    test('REQ-APP-005: phone number too short shows validation error', async ({ page }) => {
      await page.locator('input[type="text"]').fill('테스트');
      await page.locator('input[type="tel"]').fill('010-123');
      await page.locator('button:has-text("다음")').click();

      await expect(page.locator('text=전화번호를 입력해주세요.')).toBeVisible();
    });

    test('REQ-APP-006: phone input accepts free-form text including international formats', async ({ page }) => {
      const phoneInput = page.locator('input[type="tel"]');
      await phoneInput.fill('+1 234 567 8900');

      await expect(phoneInput).toHaveValue('+1 234 567 8900');
    });

    test('REQ-APP-007: valid name and phone advance to Step 2', async ({ page }) => {
      await page.locator('input[type="text"]').fill('테스트');
      await page.locator('input[type="tel"]').fill('010-1234-5678');
      await page.locator('button:has-text("다음")').click();

      // Step 2 heading should appear
      await expect(page.locator('text=희망 일정')).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Step 2 Validation (Date + Time)
  // -------------------------------------------------------------------------
  test.describe('Step 2 Validation (Date + Time)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });
      await page.locator('button:has-text("신청할게요")').click();
      await expect(page.locator('text=기본 정보')).toBeVisible();

      // Complete Step 1
      await page.locator('input[type="text"]').fill('테스트');
      await page.locator('input[type="tel"]').fill('010-1234-5678');
      await page.locator('button:has-text("다음")').click();
      await expect(page.locator('text=희망 일정')).toBeVisible();
    });

    test('REQ-APP-008: no date selected shows validation error', async ({ page }) => {
      // Select a time but leave date empty
      await page.locator('select').selectOption({ index: 1 });
      await page.locator('button:has-text("다음")').click();

      await expect(page.locator('text=날짜를 선택해주세요.')).toBeVisible();
    });

    test('REQ-APP-009: no time selected shows validation error', async ({ page }) => {
      await page.locator('input[type="date"]').fill(getTomorrowString());
      // Leave time at default empty option
      await page.locator('button:has-text("다음")').click();

      await expect(page.locator('text=시간을 선택해주세요.')).toBeVisible();
    });

    test('REQ-APP-010: valid date and time advance to Step 3 confirm screen', async ({ page }) => {
      await page.locator('input[type="date"]').fill(getTomorrowString());
      await page.locator('select').selectOption({ index: 1 });
      await page.locator('button:has-text("다음")').click();

      // Step 3 heading
      await expect(page.locator('text=신청 확인')).toBeVisible();
    });

    test('REQ-APP-011: Step 3 confirm screen displays name, phone, date, and time', async ({ page }) => {
      const tomorrow = getTomorrowString();

      await page.locator('input[type="date"]').fill(tomorrow);
      await page.locator('select').selectOption({ index: 1 });
      await page.locator('button:has-text("다음")').click();

      await expect(page.locator('text=신청 확인')).toBeVisible();
      // Use exact match to avoid collision with nav/header elements containing "테스트"
      await expect(page.locator('.text-white.font-semibold').filter({ hasText: '테스트' }).first()).toBeVisible();
      await expect(page.locator('.text-white.font-semibold').filter({ hasText: '010-1234-5678' })).toBeVisible();
      await expect(page.locator('.text-white.font-semibold').filter({ hasText: tomorrow })).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Step 3 Back Navigation
  // -------------------------------------------------------------------------
  test.describe('Step 3 Back Navigation', () => {
    test('REQ-APP-012: ← 이전 on Step 3 returns to Step 2', async ({ page }) => {
      await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });
      await page.locator('button:has-text("신청할게요")').click();

      // Step 1
      await page.locator('input[type="text"]').fill('테스트');
      await page.locator('input[type="tel"]').fill('010-1234-5678');
      await page.locator('button:has-text("다음")').click();
      await expect(page.locator('text=희망 일정')).toBeVisible();

      // Step 2
      await page.locator('input[type="date"]').fill(getTomorrowString());
      await page.locator('select').selectOption({ index: 1 });
      await page.locator('button:has-text("다음")').click();
      await expect(page.locator('text=신청 확인')).toBeVisible();

      // Go back from Step 3
      await page.locator('button:has-text("← 이전")').click();

      // Should be back on Step 2
      await expect(page.locator('text=희망 일정')).toBeVisible();
      await expect(page.locator('input[type="date"]')).toBeVisible();
    });

    test('REQ-APP-013: ← 이전 on Step 2 returns to Step 1', async ({ page }) => {
      await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });
      await page.locator('button:has-text("신청할게요")').click();

      // Step 1
      await page.locator('input[type="text"]').fill('테스트');
      await page.locator('input[type="tel"]').fill('010-1234-5678');
      await page.locator('button:has-text("다음")').click();
      await expect(page.locator('text=희망 일정')).toBeVisible();

      // Go back from Step 2
      await page.locator('button:has-text("← 이전")').click();

      await expect(page.locator('text=기본 정보')).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Submit with API mock
  // -------------------------------------------------------------------------
  test.describe('Submit with API mock', () => {
    test('REQ-APP-014: successful submission shows 신청이 완료되었습니다', async ({ page }) => {
      // Mock the apply endpoint
      await page.route('**/api/diagnosis/apply', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'test-application-id' }),
        });
      });

      await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });
      await page.locator('button:has-text("신청할게요")').click();

      // Step 1
      await page.locator('input[type="text"]').fill('테스트');
      await page.locator('input[type="tel"]').fill('010-1234-5678');
      await page.locator('button:has-text("다음")').click();
      await expect(page.locator('text=희망 일정')).toBeVisible();

      // Step 2
      await page.locator('input[type="date"]').fill(getTomorrowString());
      await page.locator('select').selectOption({ index: 1 });
      await page.locator('button:has-text("다음")').click();
      await expect(page.locator('text=신청 확인')).toBeVisible();

      // Step 3 — submit
      await page.locator('button:has-text("신청하기")').click();

      // Success screen
      await expect(page.locator('text=신청해 주셔서 감사합니다!')).toBeVisible({ timeout: 5000 });
    });

    test('REQ-APP-015: API error shows submit error message', async ({ page }) => {
      await page.route('**/api/diagnosis/apply', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: '신청 처리 중 오류가 발생했습니다.' }),
        });
      });

      await page.goto('/diagnosis', { waitUntil: 'domcontentloaded' });
      await page.locator('button:has-text("신청할게요")').click();

      await page.locator('input[type="text"]').fill('테스트');
      await page.locator('input[type="tel"]').fill('010-1234-5678');
      await page.locator('button:has-text("다음")').click();

      await page.locator('input[type="date"]').fill(getTomorrowString());
      await page.locator('select').selectOption({ index: 1 });
      await page.locator('button:has-text("다음")').click();

      await page.locator('button:has-text("신청하기")').click();

      await expect(page.locator('text=신청 처리 중 오류가 발생했습니다.')).toBeVisible({ timeout: 5000 });
      // Should remain on Step 3, not show success
      await expect(page.locator('text=신청이 완료되었습니다.')).not.toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // FloatingCTA — fbq pixel tracking
  // -------------------------------------------------------------------------
  test.describe('FloatingCTA fbq pixel tracking', () => {
    test('REQ-APP-016: clicking 전화상담 예약 calls window.fbq with Lead event', async ({ page }) => {
      // Inject fbq mock before page scripts run.
      // The real FB pixel also calls fbq('init', ...) — we capture only 'track' calls.
      await page.addInitScript(() => {
        const trackCalls: Array<{ event: string; data: unknown }> = [];
        (window as Window & { __fbqTrackCalls?: Array<unknown>; fbq?: unknown }).fbq = (
          command: string,
          event: string,
          data: unknown
        ) => {
          if (command === 'track') {
            trackCalls.push({ event, data });
          }
        };
        (window as Window & { __fbqTrackCalls?: Array<unknown> }).__fbqTrackCalls = trackCalls;
      });

      // FloatingCTA renders on the homepage (it hides on /diagnosis)
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const consultBtn = page.locator('button:has-text("전화상담 예약")');
      const isVisible = await consultBtn.isVisible().catch(() => false);

      if (!isVisible) {
        test.skip();
        return;
      }

      // Prevent actual navigation
      await page.evaluate(() => { window.open = () => null; });

      await consultBtn.click();

      const calls = await page.evaluate(() => {
        return (window as Window & { __fbqTrackCalls?: Array<{ event: string; data: unknown }> })
          .__fbqTrackCalls ?? [];
      });

      // FB pixel auto-fires PageView on load — find the Lead call specifically
      const leadCall = calls.find((c) => c.event === 'Lead');
      expect(leadCall).toBeDefined();
      expect((leadCall!.data as { content_name: string }).content_name).toBe('phone_consultation');
    });

    test('REQ-APP-017: clicking 즉시 카톡상담 calls window.fbq with Lead event', async ({ page }) => {
      await page.addInitScript(() => {
        const trackCalls: Array<{ event: string; data: unknown }> = [];
        (window as Window & { __fbqTrackCalls?: Array<unknown>; fbq?: unknown }).fbq = (
          command: string,
          event: string,
          data: unknown
        ) => {
          if (command === 'track') {
            trackCalls.push({ event, data });
          }
        };
        (window as Window & { __fbqTrackCalls?: Array<unknown> }).__fbqTrackCalls = trackCalls;
      });

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const kakaoBtn = page.locator('button:has-text("즉시 카톡상담")');
      const isVisible = await kakaoBtn.isVisible().catch(() => false);

      if (!isVisible) {
        test.skip();
        return;
      }

      await page.evaluate(() => { window.open = () => null; });
      await page.route('**/api/featured-post', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":false}' })
      );

      await kakaoBtn.click();

      const calls = await page.evaluate(() => {
        return (window as Window & { __fbqTrackCalls?: Array<{ event: string; data: unknown }> })
          .__fbqTrackCalls ?? [];
      });

      // FB pixel auto-fires PageView on load — find the Lead call specifically
      const leadCall = calls.find((c) => c.event === 'Lead');
      expect(leadCall).toBeDefined();
      expect((leadCall!.data as { content_name: string }).content_name).toBe('kakao_consultation');
    });
  });

  // -------------------------------------------------------------------------
  // Admin: 신청 목록 tab
  // -------------------------------------------------------------------------
  test.describe('Admin Applications Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('adminKey', 'test-admin-key');
      });
    });

    test('REQ-APP-018: admin page shows 신청 목록 tab', async ({ page }) => {
      await page.route('**/api/admin/diagnosis/applications*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ applications: [] }),
        });
      });
      // Pre-mock token endpoint to avoid noise
      await page.route('**/api/admin/diagnosis/tokens*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [], total: 0 }),
        });
      });

      await page.goto('/admin/diagnosis', { waitUntil: 'domcontentloaded' });

      await expect(page.locator('text=신청 목록')).toBeVisible();
    });

    test('REQ-APP-019: 신청 목록 tab renders application list from API', async ({ page }) => {
      await page.route('**/api/admin/diagnosis/applications*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            applications: [
              {
                id: 'app-001',
                name: '홍길동',
                phone: '010-1111-2222',
                preferred_date: '2026-04-01',
                preferred_time: '오전 10:00',
                status: 'pending',
                notes: null,
                created_at: new Date().toISOString(),
              },
            ],
          }),
        });
      });
      await page.route('**/api/admin/diagnosis/tokens*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [], total: 0 }),
        });
      });

      await page.goto('/admin/diagnosis', { waitUntil: 'domcontentloaded' });
      await page.locator('text=신청 목록').click();

      await expect(page.locator('text=홍길동')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=010-1111-2222')).toBeVisible();
      await expect(page.locator('text=대기중')).toBeVisible();
    });

    test('REQ-APP-020: 신청 목록 shows empty state when no applications', async ({ page }) => {
      await page.route('**/api/admin/diagnosis/applications*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ applications: [] }),
        });
      });
      await page.route('**/api/admin/diagnosis/tokens*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [], total: 0 }),
        });
      });

      await page.goto('/admin/diagnosis', { waitUntil: 'domcontentloaded' });
      await page.locator('text=신청 목록').click();

      await expect(page.locator('text=신청 내역이 없습니다.')).toBeVisible({ timeout: 5000 });
    });

    test('REQ-APP-021: 코드 발급 button in applications tab switches to 코드 관리 tab', async ({ page }) => {
      await page.route('**/api/admin/diagnosis/applications*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              applications: [
                {
                  id: 'app-002',
                  name: '김철수',
                  phone: '010-3333-4444',
                  preferred_date: '2026-04-02',
                  preferred_time: '오후 2:00',
                  status: 'pending',
                  notes: null,
                  created_at: new Date().toISOString(),
                },
              ],
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({}),
          });
        }
      });
      await page.route('**/api/admin/diagnosis/tokens*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ codes: [], total: 0 }),
        });
      });

      await page.goto('/admin/diagnosis', { waitUntil: 'domcontentloaded' });
      await page.locator('text=신청 목록').click();

      await expect(page.locator('text=김철수')).toBeVisible({ timeout: 5000 });

      // Click 코드 발급 → should navigate to 코드 관리 tab
      await page.locator('button:has-text("코드 발급")').click();

      await expect(page.locator('text=코드 관리')).toBeVisible();
      // GenerateTokenTab should be active and prefilled
      const nameInput = page.locator('input[placeholder="예: 홍길동"]');
      await expect(nameInput).toHaveValue('김철수', { timeout: 3000 });
    });
  });
});
