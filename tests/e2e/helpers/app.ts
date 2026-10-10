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
 * A fresh account per test. The suite runs in parallel against one in-memory
 * store, so isolation comes from never reusing an address, not from resetting
 * the store between tests.
 */
export function uniqueEmail(prefix = 'student'): string {
  counter += 1;
  return `${prefix}-${process.pid}-${Date.now().toString(36)}-${counter}@x-pass.test`;
}

export async function signIn(
  page: Page,
  { email, displayName }: { email: string; displayName: string },
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Display name').fill(displayName);
  await page.getByRole('button', { name: 'Enter BITE' }).click();
  await page.waitForURL('**/welcome');
}

/**
 * Signs the browser out through the real endpoint.
 *
 * There is no sign-out control in the UI yet, so this posts to the route the
 * app exposes. `page.request` shares the context's cookie jar, so the cleared
 * cookie applies to the page as well.
 */
export async function signOut(page: Page): Promise<void> {
  const response = await page.request.post('/api/auth/logout');
  expect(response.ok(), 'the logout endpoint should accept the request').toBe(true);
}

/** Sign in as a brand-new student and return the address used. */
export async function signInAsNewStudent(
  page: Page,
  displayName = 'Test Student',
): Promise<string> {
  const email = uniqueEmail();
  await signIn(page, { email, displayName });
  return email;
}

export async function completePreSurvey(
  page: Page,
  scores: Record<string, number> = {},
): Promise<void> {
  await page.goto('/pre-survey');
  const rows = page.locator('[data-interest-key]');
  for (let i = 0; i < (await rows.count()); i += 1) {
    const row = rows.nth(i);
    const key = await row.getAttribute('data-interest-key');
    const score = (key && scores[key]) ?? 4;
    await row.getByRole('button', { name: String(score), exact: true }).click();
  }
  await page
    .getByLabel('What kind of work do you think suits you, and why?')
    .fill('I think I like work where I have to defend a decision with evidence.');
  await page.getByRole('button', { name: 'Save and continue' }).click();
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

/** Sign in, skip the survey, and open the Sales workspace. */
export async function enterSalesWorkspace(page: Page): Promise<string> {
  await signInAsNewStudent(page);
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
