import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        errors = []
        page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))
        
        print("Navigating...")
        await page.goto("http://127.0.0.1:5000/index.html")
        await page.wait_for_timeout(2000)
        
        print("Evaluating...")
        canvas = await page.query_selector('canvas')
        print(f"Canvas found: {canvas is not None}")
        
        # Click the visual mode button
        buttons = await page.query_selector_all('button')
        print(f"Buttons found: {len(buttons)}")
        for i, b in enumerate(buttons):
            text = await b.inner_text()
            if 'ASCII' in text or 'Visual' in text or 'Mode' in text:
                print(f"Clicking button {text}")
                await b.click()
                await page.wait_for_timeout(1000)
        
        await browser.close()

asyncio.run(main())
