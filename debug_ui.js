const { chromium } = require('playwright');

(async () => {
  console.log("🚀 Launching headed browser...");
  // Launch in headed mode so you can see it, with slowMo to make actions visible
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();
  
  console.log("🌐 Navigating to local server...");
  await page.goto('http://127.0.0.1:5000/');
  
  console.log("⏳ Waiting for initial load...");
  await page.waitForTimeout(2000);
  
  console.log("📸 Testing the visual mode / morph buttons...");
  // Let's try clicking one of the new Morph buttons we added!
  try {
      const cubeBtn = page.locator('button[data-shape="cube"]');
      if (await cubeBtn.isVisible()) {
          console.log("🖱️ Clicking Cube morph button...");
          await cubeBtn.click();
      }
  } catch (e) {
      console.log("Could not find or click morph button.", e.message);
  }

  console.log("👀 Browser is open. Keeping it alive for 15 seconds so you can watch...");
  await page.waitForTimeout(15000);
  
  console.log("👋 Closing browser...");
  await browser.close();
})();
