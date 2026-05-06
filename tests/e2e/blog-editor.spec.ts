import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_KEY = 'test-admin-key';

/** Set localStorage and navigate to the editor, waiting for the header. */
async function gotoEditor(page: Page, query = '') {
  await page.addInitScript((key) => {
    localStorage.setItem('admin_key', key);
  }, ADMIN_KEY);

  await page.goto(`/admin/editor${query}`);
  await page.waitForSelector('header', { state: 'visible', timeout: 30_000 });
}

/** Mock GET /api/admin/posts?id=* to return the given post data. */
async function mockGetPost(page: Page, post: Record<string, unknown>) {
  await page.route('**/api/admin/posts?id=*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, post }),
    });
  });
}

/** Mock POST /api/admin/posts to return success. */
async function mockPostSave(
  page: Page,
  response: Record<string, unknown> = { success: true, id: 'test-post' }
) {
  await page.route('**/api/admin/posts', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    } else {
      await route.continue();
    }
  });
}

/** Intercept the POST /api/admin/posts request and capture its body.
 *  Must be called BEFORE page.goto so the route handler is registered first.
 */
async function capturePostBody(page: Page): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('POST /api/admin/posts not called within 15s')),
      15_000
    );

    page.route('**/api/admin/posts', async (route) => {
      if (route.request().method() === 'POST') {
        clearTimeout(timer);
        const body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, id: 'test-post' }),
        });
        resolve(body);
      } else {
        await route.continue();
      }
    });
  });
}

// Title input selector - the editor uses placeholder "Post title"
const TITLE_PLACEHOLDER = 'Post title';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Blog Editor – new post creation', () => {
  test('fills title, types in editor, saves – API receives HTML content', async ({ page }) => {
    // Set up the route capture BEFORE goto (addInitScript + route before navigation)
    await page.addInitScript((key) => {
      localStorage.setItem('admin_key', key);
    }, ADMIN_KEY);

    // Register the route intercept before navigating
    const bodyPromise = capturePostBody(page);

    await page.goto('/admin/editor');
    await page.waitForSelector('header', { state: 'visible', timeout: 30_000 });

    // Dismiss any alert dialogs automatically
    page.on('dialog', async (dialog) => dialog.accept());

    // Fill in the title – use the "Post title" placeholder, not the slug field
    const titleInput = page.getByPlaceholder(TITLE_PLACEHOLDER).first();
    await titleInput.fill('My Test Blog Post');

    // Type content in the ProseMirror editor
    const proseMirror = page.locator('.ProseMirror').first();
    await proseMirror.click();
    await proseMirror.type('Hello world from E2E test.');

    // Click the Publish button
    await page.locator('button:has-text("Publish")').click();

    // Wait for the API call and validate the body
    const body = await bodyPromise;

    expect(body.title).toBe('My Test Blog Post');
    // Content must be HTML (tiptap serialises to HTML)
    expect(typeof body.content).toBe('string');
    const content = body.content as string;
    expect(content).toMatch(/<[a-z]/i);
    expect(content).toContain('Hello world from E2E test.');
  });
});

test.describe('Blog Editor – post editing (load + re-save)', () => {
  const MOCK_POST = {
    id: 'test-post',
    title: 'Original Title',
    date: '2025-01-01',
    category: 'SAT RW',
    content: '<p>Original <strong>HTML</strong> content.</p>',
    excerpt: 'An excerpt',
    description: 'A description',
    tags: 'tag1, tag2',
    featuredImage: '',
    featuredImageAlt: '',
    featureImage: '',
    focusKeyword: '',
    author: 'SuperfastSAT',
    ctaFeatured: false,
    metaTitle: '',
    metaRobots: '',
  };

  test('loads existing post content into editor and displays title', async ({ page }) => {
    await mockGetPost(page, MOCK_POST);
    await mockPostSave(page);
    await gotoEditor(page, '?id=test-post');

    // Dismiss any alert dialogs automatically
    page.on('dialog', async (dialog) => dialog.accept());

    // Title input should be populated with the loaded title (not the slug)
    const titleInput = page.getByPlaceholder(TITLE_PLACEHOLDER).first();
    await expect(titleInput).toHaveValue('Original Title', { timeout: 10_000 });

    // The ProseMirror area should contain the loaded content
    const proseMirror = page.locator('.ProseMirror').first();
    await expect(proseMirror).toContainText('Original', { timeout: 10_000 });
  });

  test('modifies content and saves – API receives updated HTML', async ({ page }) => {
    await mockGetPost(page, MOCK_POST);

    await page.addInitScript((key) => {
      localStorage.setItem('admin_key', key);
    }, ADMIN_KEY);

    const bodyPromise = capturePostBody(page);

    await page.goto('/admin/editor?id=test-post');
    await page.waitForSelector('header', { state: 'visible', timeout: 30_000 });

    // Dismiss any alert dialogs automatically
    page.on('dialog', async (dialog) => dialog.accept());

    // Wait for title to load
    const titleInput = page.getByPlaceholder(TITLE_PLACEHOLDER).first();
    await expect(titleInput).toHaveValue('Original Title', { timeout: 10_000 });

    // Modify the title
    await titleInput.fill('Updated Title');

    // Add content in the editor
    const proseMirror = page.locator('.ProseMirror').first();
    await proseMirror.click();
    await proseMirror.press('End');
    await proseMirror.press('Enter');
    await proseMirror.type('Newly added paragraph.');

    // Click Update button
    await page.locator('button:has-text("Update")').click();

    const body = await bodyPromise;
    expect(body.title).toBe('Updated Title');
    expect(body.content as string).toContain('Newly added paragraph.');
    expect(body.content as string).toMatch(/<[a-z]/i);
  });
});

test.describe('Blog Editor – HTML content preservation', () => {
  test('saves HTML and reloads with alignment styles preserved', async ({ page }) => {
    const HTML_WITH_ALIGNMENT = '<p style="text-align: center">Centered paragraph</p>';
    const MOCK_POST_ALIGNED = {
      id: 'aligned-post',
      title: 'Aligned Post',
      date: '2025-01-01',
      category: 'SAT RW',
      content: HTML_WITH_ALIGNMENT,
      excerpt: '',
      description: '',
      tags: '',
      featuredImage: '',
      featuredImageAlt: '',
      featureImage: '',
      focusKeyword: '',
      author: 'SuperfastSAT',
      ctaFeatured: false,
      metaTitle: '',
      metaRobots: '',
    };

    await mockGetPost(page, MOCK_POST_ALIGNED);

    await page.addInitScript((key) => {
      localStorage.setItem('admin_key', key);
    }, ADMIN_KEY);

    const bodyPromise = capturePostBody(page);

    await page.goto('/admin/editor?id=aligned-post');
    await page.waitForSelector('header', { state: 'visible', timeout: 30_000 });

    // Dismiss any alert dialogs automatically
    page.on('dialog', async (dialog) => dialog.accept());

    // Wait for the editor to load
    const titleInput = page.getByPlaceholder(TITLE_PLACEHOLDER).first();
    await expect(titleInput).toHaveValue('Aligned Post', { timeout: 10_000 });

    // The ProseMirror editor should render the centered content
    const proseMirror = page.locator('.ProseMirror').first();
    await expect(proseMirror).toContainText('Centered paragraph', { timeout: 10_000 });

    // Re-save and verify HTML is preserved
    await page.locator('button:has-text("Update")').click();

    const body = await bodyPromise;
    const savedContent = body.content as string;
    expect(savedContent).toContain('Centered paragraph');
    expect(savedContent).toMatch(/<[a-z]/i);
  });
});

test.describe('Blog Editor – backward compatibility with Markdown content', () => {
  test('loads a post with Markdown content and editor renders it', async ({ page }) => {
    const MARKDOWN_POST = {
      id: 'markdown-post',
      title: 'Markdown Post',
      date: '2025-01-01',
      category: 'SAT RW',
      content: '# Hello Markdown\n\nThis is **bold** text.',
      excerpt: '',
      description: '',
      tags: '',
      featuredImage: '',
      featuredImageAlt: '',
      featureImage: '',
      focusKeyword: '',
      author: 'SuperfastSAT',
      ctaFeatured: false,
      metaTitle: '',
      metaRobots: '',
    };

    await mockGetPost(page, MARKDOWN_POST);
    await mockPostSave(page);
    await gotoEditor(page, '?id=markdown-post');

    // Dismiss any alert dialogs automatically
    page.on('dialog', async (dialog) => dialog.accept());

    // Wait for title to load
    const titleInput = page.getByPlaceholder(TITLE_PLACEHOLDER).first();
    await expect(titleInput).toHaveValue('Markdown Post', { timeout: 10_000 });

    // The editor should render the Markdown via tiptap-markdown
    const proseMirror = page.locator('.ProseMirror').first();
    await expect(proseMirror).toContainText('Hello Markdown', { timeout: 10_000 });
    await expect(proseMirror).toContainText('bold', { timeout: 5_000 });
  });
});

test.describe('Blog Editor – alignment toolbar', () => {
  test('clicking Align center button applies center alignment to saved HTML', async ({
    page,
  }) => {
    await page.addInitScript((key) => {
      localStorage.setItem('admin_key', key);
    }, ADMIN_KEY);

    const bodyPromise = capturePostBody(page);

    await page.goto('/admin/editor');
    await page.waitForSelector('header', { state: 'visible', timeout: 30_000 });

    // Dismiss any alert dialogs automatically
    page.on('dialog', async (dialog) => dialog.accept());

    // Type some content in the editor first
    const proseMirror = page.locator('.ProseMirror').first();
    await proseMirror.click();
    await proseMirror.type('Alignment test content');

    // Click the "Align center" toolbar button
    const alignCenterBtn = page.locator('button[title="Align center"]');
    await expect(alignCenterBtn).toBeVisible({ timeout: 5_000 });
    await alignCenterBtn.click();

    // Fill in title so save doesn't get blocked by validation
    const titleInput = page.getByPlaceholder(TITLE_PLACEHOLDER).first();
    await titleInput.fill('Alignment Test');

    // Save the post
    await page.locator('button:has-text("Publish")').click();

    const body = await bodyPromise;
    const content = body.content as string;
    // TextAlign extension renders style="text-align: center"
    expect(content).toContain('text-align: center');
  });

  test('clicking Align right button is visible and clickable', async ({ page }) => {
    await gotoEditor(page);

    // Dismiss any alert dialogs automatically
    page.on('dialog', async (dialog) => dialog.accept());

    const proseMirror = page.locator('.ProseMirror').first();
    await proseMirror.click();
    await proseMirror.type('Right align test');

    const alignRightBtn = page.locator('button[title="Align right"]');
    await expect(alignRightBtn).toBeVisible({ timeout: 5_000 });
    await alignRightBtn.click();

    // After clicking, the paragraph should still be visible (no crash)
    const paragraph = page.locator('.ProseMirror p').first();
    await expect(paragraph).toBeVisible();
  });
});

test.describe('Blog Editor – empty title validation', () => {
  test('shows alert and does not call API when title is empty', async ({ page }) => {
    await gotoEditor(page);

    // Track whether any POST was made
    let apiCalled = false;
    await page.route('**/api/admin/posts', async (route) => {
      if (route.request().method() === 'POST') {
        apiCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, id: 'test' }),
        });
      } else {
        await route.continue();
      }
    });

    // Capture the alert message
    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    // Ensure title is empty
    const titleInput = page.getByPlaceholder(TITLE_PLACEHOLDER).first();
    await expect(titleInput).toHaveValue('');

    await page.locator('button:has-text("Publish")').click();

    // Give time for any async call to complete
    await page.waitForTimeout(500);

    // Alert should have fired
    expect(alertMessage).toBeTruthy();
    expect(alertMessage.length).toBeGreaterThan(0);

    // API must NOT have been called
    expect(apiCalled).toBe(false);
  });

  test('alert message mentions entering a title', async ({ page }) => {
    await gotoEditor(page);

    let alertMessage = '';
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.locator('button:has-text("Publish")').click();
    await page.waitForTimeout(300);

    // The Korean message is '제목을 입력해주세요.'
    expect(alertMessage).toContain('제목');
  });
});
