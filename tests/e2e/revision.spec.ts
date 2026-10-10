import { expect, test } from '@playwright/test';
import { enterSalesWorkspace, taskCard } from './helpers/app';
import { advanceToStep, fillTask, submitTask } from './helpers/forms';

/**
 * "Something changes. Decide what holds and what moves."
 *
 * The revision step is the part of the product most easily broken by an
 * ordinary-looking refactor: make the revision form edit the same record and
 * everything still works, except the earlier decision is gone. These tests
 * pin the behaviour the landing page promises — the first proposal is
 * preserved, shown beside the revision, and never overwritten.
 */
test('proposal v1 is preserved read-only beside the revision form', async ({ page }) => {
  await enterSalesWorkspace(page);
  await advanceToStep(page, 'proposal-v1');

  const marker = 'Pilot limited to 30 office-area stores for four weeks.';
  await fillTask(page, 'proposal-v1', {
    wholesale_price_yen: 182,
    shelf_or_placement_strategy: marker,
  });
  await submitTask(page, 'proposal-v1');

  await advanceToStep(page, 'unexpected-event');

  const revision = taskCard(page, 'proposal-v2-revision');
  const earlier = revision.locator('[data-reference-task-key="proposal-v1"]');
  await expect(
    earlier,
    'the earlier proposal should be shown beside the revision',
  ).toBeVisible();

  await earlier.click();
  await expect(earlier).toContainText(marker);
  await expect(earlier).toContainText('182');

  // Read-only means read-only: there is nothing to type into.
  await expect(earlier.locator('input, textarea, select')).toHaveCount(0);
});

test('revising a submitted answer keeps a new version rather than replacing it', async ({
  page,
}) => {
  await enterSalesWorkspace(page);
  await advanceToStep(page, 'proposal-v1');

  await fillTask(page, 'proposal-v1', { wholesale_price_yen: 182 });
  await submitTask(page, 'proposal-v1');

  const card = taskCard(page, 'proposal-v1');
  // The button names the fact that this is a resubmission, not a first save.
  await expect(card.getByTestId('task-submit')).toHaveText(/Resubmit/);

  await card.locator('[data-field-key="wholesale_price_yen"] input').fill('195');
  await submitTask(page, 'proposal-v1');

  await advanceToStep(page, 'unexpected-event');

  const earlier = taskCard(page, 'proposal-v2-revision').locator(
    '[data-reference-task-key="proposal-v1"]',
  );
  // A second submission produced a second version, which is what makes the
  // first one recoverable rather than lost.
  await expect
    .poll(async () => Number(await earlier.getAttribute('data-reference-version')))
    .toBeGreaterThan(1);
  await earlier.click();
  await expect(earlier).toContainText('195');
});

test('an unchanged resubmission does not invent a version', async ({ page }) => {
  await enterSalesWorkspace(page);
  await advanceToStep(page, 'proposal-v1');

  await fillTask(page, 'proposal-v1', { wholesale_price_yen: 182 });
  await submitTask(page, 'proposal-v1');

  // Submitting the identical answer again must not bump the version. jsonb
  // normalises key order, so a naive JSON.stringify comparison would see a
  // change here every time and inflate the history.
  await submitTask(page, 'proposal-v1');
  await submitTask(page, 'proposal-v1');

  await advanceToStep(page, 'unexpected-event');
  const earlier = taskCard(page, 'proposal-v2-revision').locator(
    '[data-reference-task-key="proposal-v1"]',
  );
  await expect(earlier).toHaveAttribute('data-reference-version', '1');
});
