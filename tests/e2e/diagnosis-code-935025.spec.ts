import { test, expect } from '@playwright/test';

test.describe('Diagnosis Test with Code 935025', () => {
  test('should load test with code 935025', async ({ page }) => {
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
    
    // 10. 테스트 제목 확인
    await expect(page.locator('text=SAT Diagnostic Test')).toBeVisible();
    
    // 11. 시간 및 문제 수 표시 확인
    await expect(page.locator('text=25 questions')).toBeVisible();
    
    console.log('✅ 코드 935025로 진단테스트를 볼 수 있습니다!');
  });
});
