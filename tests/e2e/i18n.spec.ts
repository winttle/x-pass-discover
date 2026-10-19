import { expect, test } from '@playwright/test';

/**
 * The interface follows the language chosen in the globe menu, and the choice
 * sticks: it is a cookie, so pages rendered on the server honour it too.
 */
test('choosing a language translates the interface and is remembered', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.getByTestId('language-switcher').selectOption('ja');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('BITEにログイン');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

  // A fresh server render keeps the choice.
  await page.goto('/signup');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('BITEのアカウントを作成');

  await page.getByTestId('language-switcher').selectOption('ko');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('BITE 계정 만들기');
});
