import { expect, test } from '@playwright/test';
import { completePreSurvey, signIn, signOut, signUp, uniqueEmail } from './helpers/app';

/**
 * A new account's first screen is the X-PASS Discover lobby, and its START
 * button is the way into the pre-survey. Once the pre-survey is done the
 * student is past day one, and signing in goes to the welcome page instead.
 */
test('a new account opens in the lobby, and START begins the pre-survey', async ({ page }) => {
  const email = uniqueEmail('onboarding');
  await signUp(page, { email, displayName: 'First Day' });

  const lobby = page.getByTestId('start-lobby');
  await expect(lobby).toBeVisible();
  await expect(lobby).toContainText('INTRO');
  await expect(lobby).toContainText('01 / 04');
  // The way out is still on screen.
  await expect(page.getByTestId('account-menu')).toContainText('First Day');

  await page.getByTestId('start-lobby-next').click();
  await page.waitForURL('**/pre-survey');

  // Signing back in before finishing the survey still opens in the lobby.
  await signOut(page);
  await signIn(page, email);
  await expect(page.getByTestId('start-lobby')).toBeVisible();

  // After the survey, the lobby is behind them.
  await completePreSurvey(page);
  await signOut(page);
  await signIn(page, email);
  // Sign-in heads for the lobby, which sends a returning student on.
  await page.waitForURL('**/welcome');
  await page.goto('/start');
  await page.waitForURL('**/welcome');
});
