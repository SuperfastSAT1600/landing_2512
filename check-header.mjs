import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/diagnosis', { waitUntil: 'networkidle', timeout: 5000 });
    
    // Check if header exists and is visible
    const headerExists = await page.locator('header').count();
    const headerVisible = headerExists > 0 ? await page.locator('header').isVisible() : false;
    
    // Check for nav
    const navExists = await page.locator('nav').count();
    
    // Check body structure
    const bodyChildren = await page.evaluate(() => {
      return Array.from(document.body.children).map(el => ({
        tag: el.tagName,
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility
      }));
    });
    
    console.log('Header found:', headerExists > 0);
    console.log('Header visible:', headerVisible);
    console.log('Nav elements:', navExists);
    console.log('\nBody children:');
    bodyChildren.forEach((child, i) => {
      console.log(`  ${i}: <${child.tag}> display=${child.display} visibility=${child.visibility}`);
    });
    
    // Check for specific menu items
    const menuItems = await page.locator('a:has-text("진단테스트")').count();
    console.log('\n"진단테스트" menu item found:', menuItems > 0);
    
    // Take screenshot
    await page.screenshot({ path: 'diagnosis-header.png', fullPage: false });
    console.log('\nScreenshot saved to diagnosis-header.png');
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
})();
