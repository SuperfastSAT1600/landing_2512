import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  try {
    await page.goto('http://localhost:3000/diagnosis', { waitUntil: 'networkidle', timeout: 5000 });
    
    // Take screenshots
    await page.screenshot({ path: 'diagnosis-full.png', fullPage: true });
    await page.screenshot({ path: 'diagnosis-viewport.png', fullPage: false });
    
    console.log('Screenshots saved:');
    console.log('- diagnosis-full.png (full page)');
    console.log('- diagnosis-viewport.png (viewport)');
    
    // Get page dimensions
    const dimensions = await page.evaluate(() => ({
      bodyHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight,
      headerHeight: document.querySelector('header')?.offsetHeight || 0
    }));
    
    console.log('\nLayout dimensions:');
    console.log(`- Body height: ${dimensions.bodyHeight}px`);
    console.log(`- Viewport height: ${dimensions.viewportHeight}px`);
    console.log(`- Header height: ${dimensions.headerHeight}px`);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
