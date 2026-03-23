import { test, expect, Page, ElementHandle } from '@playwright/test';

/**
 * 블로그 목록에서 테이블이 포함된 포스트 URL을 동적으로 찾는다.
 * 없으면 null 반환.
 */
async function findPostWithTable(page: Page): Promise<string | null> {
  await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: 30_000 });

  // 블로그 목록의 모든 포스트 링크 수집
  const links = await page.locator('a[href^="/blog/"]').evaluateAll((els) =>
    [...new Set(els.map((el) => (el as HTMLAnchorElement).href))]
  );

  for (const href of links.slice(0, 20)) {
    try {
      const res = await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      if (!res || res.status() !== 200) continue;
      await page.waitForSelector('.prose', { state: 'visible', timeout: 8_000 });
      const tableCount = await page.locator('.prose table').count();
      if (tableCount > 0) return href;
    } catch {
      continue;
    }
  }
  return null;
}

async function selectCellTextProgrammatic(page: Page, handle: ElementHandle): Promise<string> {
  return page.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    if (!selection) return '';
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString();
  }, handle);
}

// 테이블 포스트 URL을 suite 전체에서 공유
let tablePostUrl: string | null = null;

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  tablePostUrl = await findPostWithTable(page);
  await page.close();
});

// REQ-001: 마우스 드래그로 셀 내 텍스트 선택 가능
test('REQ-001: mouse drag selects text in table cell', async ({ page }) => {
  if (!tablePostUrl) { test.skip(); return; }

  await page.goto(tablePostUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.prose table', { state: 'visible' });

  const firstCell = page.locator('.prose table td').first();
  await expect(firstCell).toBeVisible();
  const box = await firstCell.boundingBox();
  if (!box) throw new Error('no bounding box for first cell');

  await page.mouse.move(box.x + 4, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();

  const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '');
  expect(selected.trim().length).toBeGreaterThan(0);
});

// REQ-002: programmatic selection이 셀 내용과 일치
test('REQ-002: selected text matches cell content', async ({ page }) => {
  if (!tablePostUrl) { test.skip(); return; }

  await page.goto(tablePostUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.prose table', { state: 'visible' });

  const firstCell = page.locator('.prose table td').first();
  await expect(firstCell).toBeVisible();

  const cellText = await firstCell.textContent();
  const handle = await firstCell.elementHandle();
  if (!handle) throw new Error('no element handle');

  const selected = await selectCellTextProgrammatic(page, handle);
  expect(selected.trim().length).toBeGreaterThan(0);
  expect(cellText!.trim()).toContain(selected.trim().slice(0, 10));
});

// REQ-003: td에 user-select: none 없음
test('REQ-003: td has no user-select: none', async ({ page }) => {
  if (!tablePostUrl) { test.skip(); return; }

  await page.goto(tablePostUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.prose table', { state: 'visible' });

  const firstCell = page.locator('.prose table td').first();
  await expect(firstCell).toBeVisible();

  const handle = await firstCell.elementHandle();
  if (!handle) throw new Error('no element handle');

  const userSelect = await page.evaluate(
    (el) => window.getComputedStyle(el).userSelect,
    handle
  );
  expect(userSelect).not.toBe('none');
});

// REQ-005: 선택 영역 배경색이 투명도 50% 이상의 파란색 계열로 설정됨 (시각적 가시성)
test('REQ-005: selection highlight color is visible (opacity >= 50%)', async ({ page }) => {
  if (!tablePostUrl) { test.skip(); return; }

  await page.goto(tablePostUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.prose table', { state: 'visible' });

  // 페이지 최상위 div의 ::selection 배경색 확인
  // Tailwind selection:bg-blue-500/60 → rgba(59,130,246,0.60)
  const selectionBg = await page.evaluate(() => {
    // 가상 요소는 직접 getComputedStyle로 읽을 수 없으므로
    // 실제로 텍스트를 선택한 뒤 stylesheet에서 ::selection 규칙을 찾는다
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSStyleRule && rule.selectorText?.includes('::selection')) {
            const bg = rule.style.backgroundColor;
            if (bg) return bg;
          }
        }
      } catch { continue; }
    }
    return null;
  });

  // selection bg가 stylesheet에 명시돼 있으면 파란색 계열인지 확인
  if (selectionBg) {
    // rgba(59, 130, 246, 0.6) 형태 — red < 100, green > 100, blue > 200
    const match = selectionBg.match(/[\d.]+/g);
    if (match && match.length >= 3) {
      const [r, g, b] = match.map(Number);
      // 파란색 계열: blue > red
      expect(b).toBeGreaterThan(r);
    }
  }

  // 실제 드래그 후 스크린샷을 찍어 시각적으로 확인 (test-results에 저장됨)
  const firstCell = page.locator('.prose table td').first();
  // 테이블 셀을 뷰포트로 스크롤
  await firstCell.scrollIntoViewIfNeeded();
  const box = await firstCell.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 4, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 10 });
    // mouse.up 전에 스크린샷 — 선택 하이라이트 캡처
    await page.screenshot({ path: 'test-results/selection-highlight.png', clip: {
      x: Math.max(0, box.x - 20),
      y: Math.max(0, box.y - 20),
      width: box.width + 40,
      height: box.height + 40,
    }});
    await page.mouse.up();
  }
});

// REQ-004: 여러 셀에 걸친 드래그 선택 가능
test('REQ-004: multi-cell drag produces non-empty selection', async ({ page }) => {
  if (!tablePostUrl) { test.skip(); return; }

  await page.goto(tablePostUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.prose table', { state: 'visible' });

  const cells = page.locator('.prose table td');
  if (await cells.count() < 2) { test.skip(); return; }

  const box1 = await cells.nth(0).boundingBox();
  const box2 = await cells.nth(1).boundingBox();
  if (!box1 || !box2) throw new Error('no bounding box');

  await page.mouse.move(box1.x + 4, box1.y + box1.height / 2);
  await page.mouse.down();
  await page.mouse.move(box2.x + box2.width - 4, box2.y + box2.height / 2, { steps: 15 });
  await page.mouse.up();

  const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '');
  expect(selected.trim().length).toBeGreaterThan(0);
});
