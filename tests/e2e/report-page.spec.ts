import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Supabase admin client for seeding — uses service role key from env
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
);

const ALL_ANSWERS: Record<string, string> = Object.fromEntries(
  Array.from({ length: 25 }, (_, i) => [`q-${i + 1}`, `option-${(i % 4) + 1}`]),
);
const ALL_CONFIDENCE: Record<string, number> = Object.fromEntries(
  Array.from({ length: 25 }, (_, i) => [`q-${i + 1}`, 1 + (i % 5)]),
);
const ALL_TIMES: Record<string, number> = Object.fromEntries(
  Array.from({ length: 25 }, (_, i) => [`q-${i + 1}`, 45 + i * 12]),
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
    answers[q.id] = `seed-answer-${i}`;
    confidenceLevels[q.id] = 1 + (i % 5);
    questionTimes[q.id] = 45 + i * 10;
  });

  const savedWords = [
    { word: 'ephemeral', questionId: questions[0]?.id ?? 'q1', section: 'passage', positionIndex: 2, optionId: null },
    { word: 'ubiquitous', questionId: questions[1]?.id ?? 'q2', section: 'passage', positionIndex: 5, optionId: null },
    { word: 'perfunctory', questionId: questions[2]?.id ?? 'q3', section: 'question', positionIndex: 1, optionId: null },
    { word: 'ostensibly', questionId: questions[3]?.id ?? 'q4', section: 'passage', positionIndex: 8, optionId: null },
  ];

  const { data, error } = await supabase
    .from('diagnostic_test_results')
    .insert({
      student_email: 'e2e-seed@playwright.test',
      student_name: '김민준 (E2E)',
      test_id: 'diagnostic-test-1',
      test_version_id: version?.id ?? null,
      started_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      submitted_at: new Date().toISOString(),
      total_time_seconds: 2340,
      answers,
      confidence_levels: confidenceLevels,
      question_times: questionTimes,
      flagged_questions: [questions[2]?.id ?? 'q3', questions[7]?.id ?? 'q8'],
      saved_words: savedWords,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Seed failed: ${error.message}`);
  seededResultId = data.id;
  console.log('Seeded result ID:', seededResultId);
});

test.afterAll(async () => {
  if (seededResultId) {
    await supabase.from('diagnostic_test_results').delete().eq('id', seededResultId);
    console.log('Cleaned up seed result:', seededResultId);
  }
});

async function gotoReport(page: Page) {
  await page.goto(`/reports/${seededResultId}`, { waitUntil: 'networkidle' });
}

test.describe('Report Page — Complete Student Result', () => {

  test('REQ-001: Header and FloatingCTA are hidden', async ({ page }) => {
    await gotoReport(page);

    await expect(page.locator('text=진단테스트')).not.toBeVisible();
    await expect(page.locator('text=전화상담 예약')).not.toBeVisible();
  });

  test('REQ-001: No sales CTAs or booking links on page', async ({ page }) => {
    await gotoReport(page);

    // No CTA text
    await expect(page.locator('text=Unlock Your Full Score Potential')).not.toBeVisible();
    await expect(page.locator('text=Book Free')).not.toBeVisible();
    await expect(page.locator('text=Strategy Call')).not.toBeVisible();
    await expect(page.locator('text=Get Your Personalized Study Plan')).not.toBeVisible();

    // No booking links
    const bookLinks = page.locator('a[href*="forms.gle"]');
    await expect(await bookLinks.count()).toBe(0);
  });

  test('REQ-001: Cover section shows student name', async ({ page }) => {
    await gotoReport(page);

    await expect(page.getByRole('heading', { name: /김민준/i }).first()).toBeVisible();
    await expect(page.locator('p:has-text("SAT Diagnostic Report")').first()).toBeVisible();
    await expect(page.locator('text=39m').first()).toBeVisible();
  });

  test('REQ-002: No sidebar exists at any viewport', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoReport(page);
    const aside = page.locator('aside');
    await expect(await aside.count()).toBe(0);

    // Mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoReport(page);
    await expect(await aside.count()).toBe(0);
  });

  test('REQ-002: Key Recommendations appear in main content', async ({ page }) => {
    await gotoReport(page);

    // Key Recs visible in main flow (not inside an aside)
    await expect(page.locator('text=Key Recommendations')).toBeVisible();
    // Confirm it is NOT inside an aside element
    const asideWithKeyRecs = page.locator('aside:has-text("Key Recommendations")');
    await expect(await asideWithKeyRecs.count()).toBe(0);
  });

  test('REQ-002: Sticky toolbar visible with brand name', async ({ page }) => {
    await gotoReport(page);

    const toolbar = page.locator('div').filter({ hasText: /^SuperfastSAT/ }).first();
    await expect(toolbar).toBeVisible();
  });

  test('REQ-003: Section titles (Korean+English) appear — 4 sections', async ({ page }) => {
    await gotoReport(page);

    await expect(page.locator('text=전체 성적').first()).toBeVisible();
    await expect(page.locator('text=상위 10%와의 차이').first()).toBeVisible();
    await expect(page.locator('text=문제 풀이 패턴').first()).toBeVisible();
    await expect(page.locator('text=모르는 단어').first()).toBeVisible();
  });

  test('REQ-003: Mobile layout — all 4 sections visible at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoReport(page);

    await expect(page.locator('text=전체 성적').first()).toBeVisible();
    await expect(page.locator('text=상위 10%와의 차이').first()).toBeVisible();
    await expect(page.locator('text=문제 풀이 패턴').first()).toBeVisible();
    await expect(page.locator('text=모르는 단어').first()).toBeVisible();
  });

  test("REQ-003: Analyst's Take insight block appears after summary", async ({ page }) => {
    await gotoReport(page);
    await expect(page.locator("text=Analyst's Take")).toBeVisible();
  });

  test('REQ-004: Domain breakdown shows SAT domain names', async ({ page }) => {
    await gotoReport(page);

    const domainLabels = [
      'Craft and Structure',
      'Information and Ideas',
      'Algebra',
      'Advanced Math',
    ];
    for (const domain of domainLabels) {
      await expect(page.locator(`text=${domain}`).first()).toBeVisible();
    }
  });

  test('REQ-004: Highest-Leverage Domains insight appears', async ({ page }) => {
    await gotoReport(page);
    await expect(page.locator('text=Highest-Leverage Domains')).toBeVisible();
  });

  test('REQ-004: Behavioral analysis shows pacing insight', async ({ page }) => {
    await gotoReport(page);
    await expect(page.locator('text=Pacing & Confidence Pattern')).toBeVisible();
    await expect(page.locator('text=Correct').first()).toBeVisible();
    await expect(page.locator('text=Incorrect').first()).toBeVisible();
  });

  test('REQ-004: Vocabulary gap shows flagged words', async ({ page }) => {
    await gotoReport(page);
    await expect(page.locator('text=모르는 단어').first()).toBeVisible();
    await expect(page.locator('text=ephemeral')).toBeVisible();
    await expect(page.locator('text=ubiquitous')).toBeVisible();
    await expect(page.locator('text=Vocabulary Strategy')).toBeVisible();
  });

  test('Report ID appears in footer', async ({ page }) => {
    await gotoReport(page);
    await expect(page.locator(`text=${seededResultId}`)).toBeVisible();
  });
});
