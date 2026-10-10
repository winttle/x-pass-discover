import { expect, test } from '@playwright/test';
import {
  completePreSurvey,
  openStep,
  signIn,
  startBootcamp,
  stepButton,
  uniqueEmail,
} from './helpers/app';
import { completeCurrentStep } from './helpers/forms';

/**
 * The walkthrough README §10 asks for: play the whole thing as a student
 * would, in one session, and let that be what proves the steps unlock in
 * order.
 *
 * It is deliberately driven off the step rail rather than a hard-coded list of
 * the ten Sales steps. The engine is supposed to know nothing about Sales, so
 * the test that walks it knows nothing either: whatever steps the scenario
 * declares, in whatever order, each one is completed and the next must unlock.
 * Authoring Marketing should make this test longer, not broken.
 */
test.describe('the student journey', () => {
  test('a student can walk a whole bootcamp from sign-in to the report', async ({
    page,
  }) => {
    await signIn(page, { email: uniqueEmail(), displayName: 'Mina Okada' });

    await expect(page.getByText('Signed in as Mina Okada')).toBeVisible();

    await completePreSurvey(page, { interest_sales: 5, interest_marketing: 2 });
    await startBootcamp(page, 'sales');

    const stepKeys = await page
      .locator('[data-step-key]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-step-key') ?? ''));

    expect(stepKeys.length, 'the Sales bootcamp should declare its steps').toBeGreaterThan(1);

    // Only the first step starts unlocked. Everything else has to be earned.
    await expect(stepButton(page, stepKeys[0])).toHaveAttribute(
      'data-step-unlocked',
      'true',
    );
    await expect(stepButton(page, stepKeys[1])).toHaveAttribute(
      'data-step-unlocked',
      'false',
    );

    for (const [index, stepKey] of stepKeys.entries()) {
      await test.step(`step ${index + 1}/${stepKeys.length}: ${stepKey}`, async () => {
        await openStep(page, stepKey);
        const completed = await completeCurrentStep(page);
        expect(completed.length, `step "${stepKey}" had no required task`).toBeGreaterThan(0);

        await expect(stepButton(page, stepKey)).toHaveAttribute(
          'data-step-status',
          'completed',
        );

        const next = stepKeys[index + 1];
        if (next) {
          await expect(
            stepButton(page, next),
            `finishing "${stepKey}" should unlock "${next}"`,
          ).toHaveAttribute('data-step-unlocked', 'true');
        }
      });
    }

    // Submitting the final deliverable ends the bootcamp.
    await expect(page.getByText('Bootcamp complete')).toBeVisible();

    await page.getByRole('link', { name: /View career report/ }).click();
    await page.waitForURL('**/report');

    // LIKE and SKILL FIT are two columns, never one number. SKILL FIT reads NE
    // until the evaluation pipeline exists, and that is the honest answer.
    await expect(page.getByRole('heading', { name: 'LIKE vs SKILL FIT' })).toBeVisible();
    await expect(page.getByText('NE').first()).toBeVisible();
  });

  test('an unfinished bootcamp is resumed, not restarted', async ({ page }) => {
    const email = uniqueEmail();
    await signIn(page, { email, displayName: 'Resuming Student' });
    const sessionId = await startBootcamp(page, 'sales');

    const stepKeys = await page
      .locator('[data-step-key]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-step-key') ?? ''));

    await openStep(page, stepKeys[0]);
    await completeCurrentStep(page);

    // Leave, come back through the department list, and land in the same
    // session with the first step still recorded as done.
    await page.goto('/departments');
    const card = page.locator('[data-department-slug="sales"]');
    await expect(card.getByRole('button', { name: 'Resume bootcamp' })).toBeVisible();
    await card.getByRole('button', { name: 'Resume bootcamp' }).click();
    await page.waitForURL('**/workspace/**');

    expect(page.url()).toContain(sessionId);
    await expect(stepButton(page, stepKeys[0])).toHaveAttribute(
      'data-step-status',
      'completed',
    );
    await expect(stepButton(page, stepKeys[1])).toHaveAttribute(
      'data-step-unlocked',
      'true',
    );
  });
});
