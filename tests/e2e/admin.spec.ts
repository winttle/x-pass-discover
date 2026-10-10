import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL } from '../../playwright.config';
import { enterSalesWorkspace, openStep, signIn } from './helpers/app';
import { completeCurrentStep } from './helpers/forms';
import { ReceivedTraffic } from './helpers/leak-scan';
import { hiddenFactSecrets, loadServerSecrets } from './helpers/secrets';

const secrets = loadServerSecrets();

/**
 * Admin is a debugging surface, and in a production build it is closed unless
 * an email is allow-listed. These tests cover both halves of that: a student
 * cannot reach it, and what an admin does reach still withholds the things no
 * browser may ever receive.
 */
test('a student cannot reach the admin screens in a production build', async ({ page }) => {
  await enterSalesWorkspace(page);

  await page.goto('/admin/ai-personas');
  await page.waitForURL('**/departments');
  expect(page.url(), 'a non-allow-listed user is sent back to the app').toContain(
    '/departments',
  );
});

test('the persona inspector shows the wiring and withholds the content', async ({ page }) => {
  const traffic = new ReceivedTraffic(page);
  await signIn(page, { email: ADMIN_EMAIL, displayName: 'E2E Admin' });

  await page.goto('/admin/ai-personas');
  await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  await traffic.snapshotDom(page, '/admin/ai-personas');

  // The wiring is visible — that is what the page is for.
  await expect(page.getByText('content withheld — server-only').first()).toBeVisible();
  await expect(page.getByText('Disclosure rule:').first()).toBeVisible();

  // The content and the prompts are not, here or anywhere.
  await traffic.assertAbsent([...secrets.neverAnywhere, ...hiddenFactSecrets(secrets)]);
});

/**
 * Behavior events are evidence, not points. The inspector exists so their
 * ORDER can be checked; the moment it starts totalling them it has become the
 * scoring mechanism the brief rules out.
 */
test('the behavior log records ordered evidence and scores nothing', async ({ page }) => {
  await signIn(page, { email: ADMIN_EMAIL, displayName: 'E2E Admin' });

  // Do a little work so there is something to log.
  const { startBootcamp } = await import('./helpers/app');
  await startBootcamp(page, 'sales');
  const stepKeys = await page
    .locator('[data-step-key]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-step-key') ?? ''));
  await openStep(page, stepKeys[0]);
  await completeCurrentStep(page);

  await page.goto('/admin/events');
  await expect(page.getByRole('heading', { name: 'Behavior events' })).toBeVisible();
  await expect(page.getByText('step_started').first()).toBeVisible();

  const body = await page.content();
  for (const forbidden of ['Score', 'score:', 'Points', 'Total points']) {
    expect(
      body.includes(forbidden),
      `the behavior log must not present "${forbidden}" — events are evidence, not points`,
    ).toBe(false);
  }
});
