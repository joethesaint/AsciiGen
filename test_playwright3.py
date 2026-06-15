import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        def handle_page_error(exc):
            print(f"Page Error Name: {exc.name}")
            print(f"Page Error Message: {exc.message}")
            print(f"Page Error Stack: {exc.stack}")
            
        page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}"))
        page.on("pageerror", handle_page_error)
        
        print("Navigating...")
        await page.goto("http://127.0.0.1:5000/index.html")
        await page.wait_for_timeout(2000)
        
        await browser.close()

asyncio.run(main())
