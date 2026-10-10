import { expect, test } from '@playwright/test';
import { signIn, signOut, uniqueEmail } from './helpers/app';

/**
 * Sign-in is also sign-up, and the display name belongs to the sign-in.
 *
 * The second test is a regression: the form asked for a display name every
 * time and then discarded it for anyone who already had an account, so the
 * first name a student ever typed was the one they were stuck with.
 */
test('an unknown email creates the account and a known one resumes it', async ({ page }) => {
  const email = uniqueEmail();

  await signIn(page, { email, displayName: 'Haruka Sato' });
  await expect(page.getByText('Signed in as Haruka Sato')).toBeVisible();

  await signOut(page);
  await signIn(page, { email, displayName: 'Haruka Sato' });
  await expect(page.getByText('Signed in as Haruka Sato')).toBeVisible();

  // No separate sign-up screen exists, and the form says so rather than
  // leaving a returning student hunting for one.
  await signOut(page);
  await page.goto('/login');
  await expect(page.getByText(/There is no separate sign-up/)).toBeVisible();
});

test('signing in with a different display name updates it', async ({ page }) => {
  const email = uniqueEmail();

  await signIn(page, { email, displayName: 'Before Rename' });
  await expect(page.getByText('Signed in as Before Rename')).toBeVisible();

  await signOut(page);
  await signIn(page, { email, displayName: 'After Rename' });

  await expect(
    page.getByText('Signed in as After Rename'),
    'the name typed at sign-in should be the name shown',
  ).toBeVisible();
  await expect(page.getByText('Signed in as Before Rename')).toHaveCount(0);
});
