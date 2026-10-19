import { expect, test } from '@playwright/test';
import { signIn, signUp, signUpAsNewStudent, uniqueEmail } from './helpers/app';

/**
 * Sign-up and sign-in are two screens that do two different things, and the
 * difference matters: one starts a fresh bootcamp, the other resumes one that
 * may already hold hours of work. A form that blurs them eventually loses
 * somebody's.
 */
test('a new student creates an account, and comes back to the same one', async ({
  page,
}) => {
  const email = uniqueEmail();

  await signUp(page, { email, displayName: 'Haruka Sato' });
  await expect(page.getByTestId('account-menu')).toContainText('Haruka Sato');

  await page.getByTestId('sign-out').click();
  await page.waitForURL(/\/$/);

  await signIn(page, email);
  await expect(
    page.getByTestId('account-menu'),
    'signing back in should reach the same account, name and all',
  ).toContainText('Haruka Sato');
});

test('signing up with an email that already has an account is refused', async ({
  page,
}) => {
  const email = uniqueEmail();
  await signUp(page, { email, displayName: 'First Owner' });
  await page.getByTestId('sign-out').click();
  await page.waitForURL(/\/$/);

  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Display name').fill('Someone Else');
  await page.getByRole('button', { name: 'Create account' }).click();

  const error = page.getByTestId('auth-error');
  await expect(error).toBeVisible();
  await expect(error).toContainText('already has an account');
  expect(page.url(), 'a refused sign-up stays on the sign-up page').toContain('/signup');

  // The way forward is offered rather than left for the student to work out.
  await error.getByRole('link', { name: /Sign in with this email/ }).click();
  await page.waitForURL('**/login**');
  await page.getByRole('button', { name: 'Enter BITE' }).click();
  // Still before the pre-survey, so sign-in opens in the lobby.
  await page.waitForURL('**/start');

  // The original account is reached, and its display name was not overwritten.
  await expect(page.getByTestId('account-menu')).toContainText('First Owner');
});

test('signing in with an unknown email offers sign-up instead of inventing an account', async ({
  page,
}) => {
  const email = uniqueEmail('never-registered');

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Enter BITE' }).click();

  const error = page.getByTestId('auth-error');
  await expect(error).toBeVisible();
  await expect(error).toContainText('No account uses that email');
  expect(page.url()).toContain('/login');

  await error.getByRole('link', { name: /Create an account with this email/ }).click();
  await page.waitForURL('**/signup**');

  // The address is carried over, so a student who mistyped nothing does not
  // type it twice.
  await expect(page.getByLabel('Email')).toHaveValue(email);
});

test('signing out ends the session and leaves the private pages unreachable', async ({
  page,
}) => {
  await signUpAsNewStudent(page, 'Leaving Student');

  await page.goto('/departments');
  await expect(page.getByTestId('account-menu')).toBeVisible();
  await expect(page.getByTestId('account-menu')).toContainText('Leaving Student');

  await page.getByTestId('sign-out').click();
  await page.waitForURL(/\/$/);

  // Back on the front door, offered as a visitor rather than a student.
  await expect(page.getByRole('link', { name: 'Create an account' })).toBeVisible();

  await page.goto('/departments');
  await page.waitForURL('**/login');
});
