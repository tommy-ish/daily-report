import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display the home page', async ({ page }) => {
    await page.goto('/');

    // ページタイトルを確認
    await expect(page.locator('h1')).toContainText('日報管理システム');
  });

  test('should have welcome message', async ({ page }) => {
    await page.goto('/');

    // Welcome メッセージを確認
    await expect(page.locator('text=Welcome to the Daily Report System')).toBeVisible();
  });
});
