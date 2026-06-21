/**
 * 선제 진단 배너 2단계(즉시 정량 → 심화) E2E
 * - Stage 1(fast /insight-brief): 즉시 표시 (lens/evidence 없음)
 * - Stage 2(deep /insight-brief/deep): 준비되면 교체, 구루 렌즈 뱃지 + 근거 노출, 🔬 심화 뱃지
 */
import { test, expect } from '@playwright/test';

const ADMIN_KEY = 'test-admin-key';

const FAST_AREAS = [
  { title: '네이버 검색 첫 응답 지연', severity: 'critical', why: '평균 111시간', suggestion: '응답 시간을 24시간 내로 단축하자.' },
];

const DEEP_AREAS = [
  {
    title: '네이버 첫 응답 111시간 — 리드 소각',
    severity: 'critical',
    why: '검색 의도 최고 리드를 4.6일 방치',
    lens: 'Sean Ellis',
    evidence: '네이버 첫 응답 111.2h (KPI)',
    suggestion: '폼 제출 즉시 자동 문자로 5분 내 응답하자.',
  },
  {
    title: '가격 이의 — 확신 부재 신호',
    severity: 'warn',
    why: '이탈 메모 3건이 동일 패턴',
    lens: 'Alex Hormozi',
    evidence: '가격 이의 3건 (메모)',
    suggestion: '성과 보장 오퍼로 위험을 우리가 떠안자.',
  },
];

test.describe('선제 진단 배너 2단계', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem('admin_key', key), ADMIN_KEY);
    // 페이지 부수 호출은 빈 데이터로 (배너와 독립)
    await page.route('**/api/crm/stats**', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { overview: {}, by_source: [], stage_flow: [] } }) }),
    );
    await page.route('**/api/crm/payments**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));
    await page.route('**/api/crm/students**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }));

    // 인사이트 엔드포인트: /deep 여부로 분기
    await page.route('**/api/crm/insight-brief**', async (route) => {
      const isDeep = route.request().url().includes('/insight-brief/deep');
      if (isDeep) await new Promise((res) => setTimeout(res, 1200)); // 심화는 지연 → 칩 관찰
      const areas = isDeep ? DEEP_AREAS : FAST_AREAS;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ generatedAt: new Date().toISOString(), areas }) });
    });

    await page.goto('/admin/crm');
  });

  test('빠른 정량 → 심화 교체, 구루 렌즈·근거 노출', async ({ page }) => {
    // Stage 1: 빠른 정량 인사이트가 먼저 뜬다
    await expect(page.getByText('네이버 검색 첫 응답 지연')).toBeVisible({ timeout: 10000 });
    // 심화 분석 중 칩
    await expect(page.getByText('심화 분석 중…')).toBeVisible();
    await page.screenshot({ path: 'tests/e2e/__screenshots__/insight-deep-stage1.png' });

    // Stage 2: 심화본으로 교체 — 구루 렌즈 뱃지 + 근거
    await expect(page.getByText('Sean Ellis')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Alex Hormozi')).toBeVisible();
    await expect(page.getByText('근거: 네이버 첫 응답 111.2h (KPI)')).toBeVisible();
    await expect(page.getByText('심화', { exact: true })).toBeVisible(); // 🔬 심화 뱃지
    // 빠른 정량 항목은 사라지고 심화 항목으로 교체됨
    await expect(page.getByText('네이버 검색 첫 응답 지연')).toHaveCount(0);
    await page.screenshot({ path: 'tests/e2e/__screenshots__/insight-deep-stage2.png' });
  });
});
