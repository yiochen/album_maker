import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER CRASH:', err.message));

    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        await page.click('text=Text');
        await page.waitForTimeout(1000);

        const coords = await page.evaluate(() => {
            if (!window._fabricCanvas) return null;
            const rect = window._fabricCanvas.getElement().getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        });

        if (coords) {
            console.log(`Clicking exact canvas center at ${coords.x}, ${coords.y}`);
            await page.mouse.click(coords.x, coords.y, { clickCount: 2 });
            await page.waitForTimeout(1000);

            await page.waitForSelector('.tiptap', { state: 'visible' });
            await page.click('.tiptap');
            await page.waitForTimeout(500);

            await page.keyboard.press('Backspace');

            await page.keyboard.type('This is a very long text to test word wrap coordinates checking.');

            console.log('Clicking outside to save...');
            await page.mouse.click(10, 10);
            await page.waitForTimeout(2000);
        } else {
            console.log('Could not find canvas coordinates.');
        }

    } catch (e) {
        console.error('Test failed:', e);
    } finally {
        await browser.close();
    }
})();
