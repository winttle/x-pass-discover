import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Flow helpers for the student journey.
 *
 * These speak in the product's vocabulary — sign in, start a bootcamp, open a
 * step — so a spec reads as the thing it is checking rather than as a list of
 * clicks. Everything is addressed through `data-*` hooks, never through copy,
 * so rewording the UI does not fail the suite.
 */

let counter = 0;

/**
 * Where signing in lands: the lobby (`/start`) for anyone who has not yet taken
 * the pre-survey, the welcome page for everyone else.
 */
export const SIGNED_IN_URL = /\/(start|welcome)(\?.*)?$/;

/**
 * A fresh account per test. The suite runs in parallel against one in-memory
 * store, so isolation comes from never reusing an address, not from resetting
 * the store between tests.
 */
export function uniqueEmail(prefix = 'student'): string {
  counter += 1;
  return `${prefix}-${process.pid}-${Date.now().toString(36)}-${counter}@x-pass.test`;
}

export async function signUp(
  page: Page,
  { email, displayName }: { email: string; displayName: string },
): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Display name').fill(displayName);
  await page.getByRole('button', { name: 'Create account' }).click();
  // A brand-new account has not taken the pre-survey, so it opens in the lobby.
  await page.waitForURL('**/start');
}

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Enter BITE' }).click();
  await page.waitForURL(SIGNED_IN_URL);
}

/**
 * Signs the browser out through the real endpoint. The UI button is exercised
 * by `identity.spec.ts`; everywhere else this is setup, not the thing under
 * test, and a POST is faster and independent of which page is open.
 */
export async function signOut(page: Page): Promise<void> {
  const response = await page.request.post('/api/auth/logout');
  expect(response.ok(), 'the logout endpoint should accept the request').toBe(true);
}

/**
 * For the fixed addresses a spec reuses across tests (the allow-listed admin,
 * say): create the account the first time, sign into it afterwards.
 */
export async function ensureSignedIn(
  page: Page,
  { email, displayName }: { email: string; displayName: string },
): Promise<void> {
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Display name').fill(displayName);
  await page.getByRole('button', { name: 'Create account' }).click();

  await Promise.race([
    page.waitForURL(SIGNED_IN_URL),
    page.getByTestId('auth-error').waitFor({ state: 'visible' }),
  ]);
  if (SIGNED_IN_URL.test(new URL(page.url()).pathname)) return;
  await signIn(page, email);
}

/** Creates a brand-new account and returns the address used. */
export async function signUpAsNewStudent(
  page: Page,
  displayName = 'Test Student',
): Promise<string> {
  const email = uniqueEmail();
  await signUp(page, { email, displayName });
  return email;
}

export async function completePreSurvey(
  page: Page,
  scores: Record<string, number> = {},
): Promise<void> {
  await page.goto('/pre-survey');
  // One question per screen, in whatever order and number the content
  // declares: answer what is shown, then move on until the survey submits.
  for (let guard = 0; guard < 200; guard += 1) {
    const question = page.locator('[data-question-key]');
    await question.waitFor();
    const key = (await question.getAttribute('data-question-key')) ?? '';
    const kind = await question.getAttribute('data-question-kind');
    if (kind === 'scale') {
      await question
        .getByRole('button', { name: String(scores[key] ?? 4), exact: true })
        .click();
    } else {
      await question
        .locator('textarea')
        .fill('I think I like work where I have to defend a decision with evidence.');
    }
    const next = page.getByTestId('survey-next');
    const submits = (await next.textContent())?.includes('Submit');
    await next.click();
    if (submits) break;
    await expect(question).not.toHaveAttribute('data-question-key', key);
  }
  await page.waitForURL('**/departments');
}

/**
 * Starts (or resumes) a department's bootcamp and lands in its workspace.
 * Returns the session id taken from the URL.
 */
export async function startBootcamp(page: Page, slug = 'sales'): Promise<string> {
  await page.goto('/departments');
  const card = page.locator(`[data-department-slug="${slug}"]`);
  await expect(card).toHaveAttribute('data-department-status', 'playable');
  await card.getByRole('button', { name: /Start bootcamp|Resume bootcamp/ }).click();
  await page.waitForURL('**/workspace/**');
  const sessionId = page.url().split('/workspace/')[1]?.split(/[?#]/)[0] ?? '';
  expect(sessionId).not.toBe('');
  return sessionId;
}

/** Create an account, skip the survey, and open the Sales workspace. */
export async function enterSalesWorkspace(page: Page): Promise<string> {
  await signUpAsNewStudent(page);
  return startBootcamp(page, 'sales');
}

export function stepButton(page: Page, stepKey: string): Locator {
  return page.locator(`[data-step-key="${stepKey}"]`);
}

/** Opens a step in the rail. Fails loudly if the step is still locked. */
export async function openStep(page: Page, stepKey: string): Promise<void> {
  const button = stepButton(page, stepKey);
  await expect(
    button,
    `step "${stepKey}" should be unlocked before it can be opened`,
  ).toHaveAttribute('data-step-unlocked', 'true');
  await button.click();
  await expect(taskCards(page).first()).toBeVisible();
}

export function taskCards(page: Page): Locator {
  return page.locator('[data-task-key]');
}

export function taskCard(page: Page, taskKey: string): Locator {
  return page.locator(`[data-task-key="${taskKey}"]`);
}

/** The keys of every task rendered for the step currently on screen. */
export async function visibleTaskKeys(page: Page): Promise<string[]> {
  return taskCards(page).evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-task-key') ?? ''),
  );
}
