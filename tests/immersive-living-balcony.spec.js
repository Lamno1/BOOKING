import { test, expect } from '@playwright/test';

test.describe('immersive living balcony milestone', () => {
  test('opens immersive experience and exposes minimal HUD', async ({ page }) => {
    await page.goto('/');
    await page.locator('.view-tab[data-media="360"]').click();
    await expect(page.locator('#experience-modal')).toBeVisible();
    await expect(page.locator('#experience-canvas')).toBeVisible();
  });
  test('switches living and balcony in one scene', async ({ page }) => {
    await page.goto('/');
    await page.locator('.view-tab[data-media="360"]').click();
    await page.locator('.scene-nav button[data-scene="balcony"]').click();
    await expect(page.locator('.scene-nav button[data-scene="balcony"]')).toHaveClass(/active/);
  });
});
