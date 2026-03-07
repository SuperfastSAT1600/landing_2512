import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  try {
    await page.goto('http://localhost:3000/diagnosis', { waitUntil: 'networkidle' });
    
    // Fill OTP code
    const inputs = await page.locator('input[inputMode="numeric"]').all();
    for (let i = 0; i < inputs.length; i++) {
      await inputs[i].fill(String(i + 1));
    }
    
    // Submit
    await page.click('button:has-text("확인")');
    await page.waitForTimeout(1500);
    
    // Take screenshot of test screen
    await page.screenshot({ path: '/tmp/test-screen.png', fullPage: true });
    console.log('Test screen screenshot saved');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
