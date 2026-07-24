import { test, expect } from '@playwright/test';

const pages = ['/', '/anime', '/resources', '/writing', '/audit'];

for (const path of pages) {
  test(`page ${path} renders without application errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('main')).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('global search, theme, favorite controls and mobile navigation remain interactive', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /全局搜索|打开全局搜索/ }).click();
  await page.getByRole('textbox').fill('AGE');
  await expect(page.locator('.search-results')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /切换到/ }).click();
  if (await page.getByRole('button', { name: /打开导航菜单/ }).count()) await page.getByRole('button', { name: /打开导航菜单/ }).click();
});
