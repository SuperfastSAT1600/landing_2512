import { test, expect } from '@playwright/test';

test.describe('Diagnosis Test - Question Loading', () => {
  test('should load and display question 1', async ({ page }) => {
    // 1. 진단테스트 페이지 접속
    await page.goto('/diagnosis', { waitUntil: 'networkidle' });
    
    // 2. 코드 입력 (935025)
    const codeDigits = ['9', '3', '5', '0', '2', '5'];
    const inputs = page.locator('input[inputmode="numeric"]');
    
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill(codeDigits[i]);
    }
    
    // 3. 확인 버튼 클릭
    await page.locator('button:has-text("확인")').click();
    
    // 4. 학생 정보 확인 페이지 대기
    await expect(page.locator('text=Confirm Your Identity')).toBeVisible({ timeout: 5000 });
    
    // 5. "That's me" 확인 버튼 클릭
    await page.locator('button:has-text("That\'s me")').click();
    
    // 6. 이메일 입력 페이지로 진행
    await expect(page.locator('text=Enter Your Email')).toBeVisible({ timeout: 5000 });
    
    // 7. 이메일 입력
    await page.locator('input[type="email"]').fill('test@example.com');
    
    // 8. Continue 버튼 클릭
    await page.locator('button:has-text("Continue")').click();
    
    // 9. 진단테스트 Important Notice 페이지 로드 확인
    await expect(page.locator('text=Important Notice')).toBeVisible({ timeout: 5000 });
    
    // 10. 시작 버튼 클릭
    const startButton = page.locator('button').filter({ hasText: 'Begin' }).first();
    if (await startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startButton.click();
    } else {
      // 다른 시작 버튼이 있을 수 있음
      const anyButton = page.locator('button').last();
      await anyButton.click();
    }
    
    // 11. 1번 문제 로드 확인
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Question')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ 1번 문제가 정상적으로 표시됩니다!');
  });
});
