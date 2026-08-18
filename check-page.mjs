import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  try {
    console.log('Opening http://localhost:3000/diagnosis...');
    await page.goto('http://localhost:3000/diagnosis', { waitUntil: 'networkidle' });
    
    console.log('Page loaded. Taking screenshot...');
    await page.screenshot({ path: '/tmp/diagnosis-page.png', fullPage: true });
    console.log('Screenshot saved to /tmp/diagnosis-page.png');
    
    // Keep browser open for inspection
    console.log('\nBrowser is open for inspection. You can interact with the page.');
    console.log('Press Enter to close the browser when done...\n');
    
    await new Promise(resolve => process.stdin.once('data', resolve));
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
