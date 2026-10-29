/**
 * v2 학생 튜토리얼 (스케줄 / Study Hall / Test Center 미션)
 * - 공개 라우트 /guide/sfv2: 비로그인 접근, noindex
 * - 지시된 요소만 진행으로 인정, 오클릭 힌트, 완료 후 진행도 유지
 * - /admin/guide: 동일 컴포넌트 + 학생용 URL 복사 버튼
 */
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const SHOT_DIR = process.env.E2E_SHOT_DIR;

const tid = (page: Page, id: string) => page.locator(`[data-tutorial-id="${id}"]`).first();
const shot = async (page: Page, name: string) => {
  if (SHOT_DIR) await page.screenshot({ path: `${SHOT_DIR}/${name}.png` });
};

const MISSIONS = [
  { name: /스케줄 입력하기/, tag: 'schedule', targets: ['nav-schedule', 'avail-edit', 'avail-input', 'avail-save'], last: 'Availability saved.' },
  { name: /Study Hall 입장하기/, tag: 'study-hall', targets: ['nav-study-hall', 'toggle-camera', 'toggle-screen', 'enter-button'], last: '입장 완료!' },
  { name: /Test Center 입장하기/, tag: 'test-center', targets: ['nav-test-center', 'toggle-camera', 'toggle-screen', 'enter-button'], last: '입장 완료!' },
];

async function play(page: Page, m: (typeof MISSIONS)[number], vp: string) {
  await page.getByRole('button', { name: m.name }).click();
  await expect(page.getByText('STEP 1 / 4')).toBeVisible();

  // 지시되지 않은 곳을 누르면 진행되지 않고 힌트가 뜬다
  await page.getByText('Good evening.').click();
  await expect(page.getByText('반짝이는 곳을 눌러 주세요!')).toBeVisible();
  await expect(page.getByText('STEP 1 / 4')).toBeVisible();

  for (const [i, target] of m.targets.entries()) {
    await expect(page.getByText(`STEP ${i + 1} / 4`)).toBeVisible();
    // 말풍선이 프레임 밖으로 잘리지 않는다
    const box = await page.getByRole('status').first().boundingBox();
    const vw = page.viewportSize()!.width;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vw);
    await shot(page, `${vp}-${m.tag}-step${i + 1}`);
    await tid(page, target).click();
  }
  await expect(page.getByText(m.last)).toBeVisible();
  await expect(page.getByText('미션 완료!')).toBeVisible();
  await expect(page.getByRole('link', { name: /v2 .* 열기/ })).toHaveAttribute('href', /^https:\/\/app\.superfastsat\.io\//);
  await shot(page, `${vp}-${m.tag}-done`);
}

for (const vp of [{ tag: 'mobile', width: 375, height: 800 }, { tag: 'desktop', width: 1280, height: 800 }]) {
  test(`공개 튜토리얼 3개 미션 완주 (${vp.tag})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE}/guide/sfv2`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

    for (const m of MISSIONS) {
      await play(page, m, vp.tag);
      await page.getByRole('button', { name: /미션 목록/ }).click();
    }
    await expect(page.getByLabel('완료')).toHaveCount(3);
    await page.reload();
    await expect(page.getByLabel('완료')).toHaveCount(3);
  });
}

test('이전 단계 / 처음부터 버튼', async ({ page }) => {
  await page.goto(`${BASE}/guide/sfv2`);
  await page.getByRole('button', { name: /스케줄 입력하기/ }).click();
  await tid(page, 'nav-schedule').click();
  await page.getByRole('button', { name: '이전 단계' }).click();
  await expect(page.getByText('STEP 1 / 4')).toBeVisible();
  await tid(page, 'nav-schedule').click();
  await page.getByRole('button', { name: /처음부터/ }).click();
  await expect(page.getByText('STEP 1 / 4')).toBeVisible();
});

test('admin 튜토리얼 페이지: 동일 컴포넌트와 URL 복사 버튼', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => localStorage.setItem('admin_key', 'test-admin-key'));
  await page.goto(`${BASE}/admin/guide`);
  await expect(page.getByRole('heading', { name: 'v2 학생 튜토리얼' })).toBeVisible();
  await expect(page.getByRole('button', { name: /스케줄 입력하기/ })).toBeVisible();
  await page.getByRole('button', { name: /학생용 URL 복사/ }).click();
  await expect(page.getByText('복사됨')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/guide\/sfv2$/);
});
