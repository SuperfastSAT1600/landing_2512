import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Supabase admin client for seeding
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
);

let seededResultId: string;

test.beforeAll(async () => {
  const { data: version } = await supabase
    .from('diagnostic_test_versions')
    .select('id, questions')
    .eq('is_current', true)
    .maybeSingle();

  const questions = (version?.questions ?? []) as { id: string }[];
  const answers: Record<string, string> = {};
  const confidenceLevels: Record<string, number> = {};
  const questionTimes: Record<string, number> = {};

  questions.forEach((q, i) => {
    answers[q.id] = `nav-seed-${i}`;
    confidenceLevels[q.id] = 1 + (i % 5);
    questionTimes[q.id] = 60 + i * 8;
  });

  const { data, error } = await supabase
    .from('diagnostic_test_results')
    .insert({
      student_email: 'nav-e2e@playwright.test',
      student_name: '이지원 (E2E Nav)',
      test_id: 'diagnostic-test-1',
      test_version_id: version?.id ?? null,
      started_at: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
      submitted_at: new Date().toISOString(),
      total_time_seconds: 2280,
      answers,
      confidence_levels: confidenceLevels,
      question_times: questionTimes,
      flagged_questions: [],
      saved_words: [],
    })
    .select('id')
    .single();

  if (error) throw new Error(`Nav test seed failed: ${error.message}`);
  seededResultId = data.id;
});

test.afterAll(async () => {
  if (seededResultId) {
    await supabase.from('diagnostic_test_results').delete().eq('id', seededResultId);
  }
});

test.describe('REQ-003 + REQ-013: Section anchors and Korean headers', () => {

  test('REQ-003: 4 section anchor IDs exist in DOM', async ({ page }) => {
    await page.goto(`/reports/${seededResultId}`, { waitUntil: 'networkidle' });

    for (const id of ['section-01', 'section-02', 'section-03', 'section-04']) {
      const el = page.locator(`#${id}`);
      await expect(el).toBeAttached();
    }
  });

  test('REQ-013: Korean section titles are visible', async ({ page }) => {
    await page.goto(`/reports/${seededResultId}`, { waitUntil: 'networkidle' });

    await expect(page.locator('text=전체 성적').first()).toBeVisible();
    await expect(page.locator('text=상위 10%와의 차이').first()).toBeVisible();
    await expect(page.locator('text=문제 풀이 패턴').first()).toBeVisible();
    await expect(page.locator('text=모르는 단어').first()).toBeVisible();
  });

  test('REQ-013: English section subtitles are visible', async ({ page }) => {
    await page.goto(`/reports/${seededResultId}`, { waitUntil: 'networkidle' });

    await expect(page.locator('text=Overall Score').first()).toBeVisible();
    await expect(page.locator('text=vs. Top 10%').first()).toBeVisible();
    await expect(page.locator('text=Test-Taking Patterns').first()).toBeVisible();
    await expect(page.locator('text=Vocabulary Gap').first()).toBeVisible();
  });

  test('REQ-001: ChapterNav renders 4 pill buttons', async ({ page }) => {
    await page.goto(`/reports/${seededResultId}`, { waitUntil: 'networkidle' });

    // Wait for ChapterNav to mount (client component)
    await page.waitForTimeout(500);

    await expect(page.locator('button:has-text("01 전체 성적")')).toBeVisible();
    await expect(page.locator('button:has-text("02 상위 10%")')).toBeVisible();
    await expect(page.locator('button:has-text("03 풀이 패턴")')).toBeVisible();
    await expect(page.locator('button:has-text("04 단어")')).toBeVisible();
  });

  test('REQ-001: ChapterNav pill click scrolls to section', async ({ page }) => {
    await page.goto(`/reports/${seededResultId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Click section-04 pill
    await page.locator('button:has-text("04 단어")').click();
    await page.waitForTimeout(800);

    // section-04 should be in view
    const section04 = page.locator('#section-04');
    await expect(section04).toBeInViewport({ ratio: 0.1 });
  });

});
