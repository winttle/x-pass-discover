import { expect, test } from '@playwright/test';
import { enterSalesWorkspace } from './helpers/app';

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

/**
 * Scenario content is translated as an overlay on the English the session is
 * pinned to: the words change, the step keys and rules do not, so a student
 * can switch language halfway through a bootcamp and keep their place.
 */
test('the departments, the workspace and the scenario follow the language', async ({
  page,
}) => {
  const sessionId = await enterSalesWorkspace(page);

  await page.goto('/departments');
  await page.getByTestId('language-switcher').selectOption('ja');
  const card = page.locator('[data-department-slug="sales"]');
  await expect(card).toContainText('BITE Protein Drink を、採算の取れる条件で QuickMart に採用してもらいます');
  await expect(card.getByRole('button', { name: 'ブートキャンプを再開' })).toBeVisible();

  await page.goto(`/workspace/${sessionId}`);
  await expect(page.locator('[data-step-key="sales-training"]')).toContainText('営業トレーニング');
  // A locked step explains itself in Japanese, naming the step in Japanese.
  await expect(page.locator('[data-step-key="onboarding"]')).toContainText(
    '先に「営業トレーニング」を完了してください。',
  );
  await expect(page.getByText('営業スターターガイド：プロの考え方')).toBeVisible();

  // The engine still runs on the same keys: completing the training in
  // Japanese unlocks the next step.
  await page.getByTestId('acknowledge').click();
  await expect(page.locator('[data-step-key="onboarding"]')).toHaveAttribute(
    'data-step-unlocked',
    'true',
  );

  // A finished step points the student onward instead of leaving them there.
  const next = page.getByTestId('next-step');
  await expect(next).toContainText('次は「オンボーディング');
  await next.getByRole('button', { name: '次のステップへ進む →' }).click();
  await expect(page.locator('[data-step-key="onboarding"]')).toHaveAttribute(
    'aria-current',
    'step',
  );

  // And back to English, same session, same progress.
  await page.getByTestId('language-switcher').selectOption('en');
  await expect(page.locator('[data-step-key="sales-training"]')).toContainText('Sales Training');
  await expect(page.locator('[data-step-key="sales-training"]')).toHaveAttribute(
    'data-step-status',
    'completed',
  );
});
