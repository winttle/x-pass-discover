import { expect, test } from '@playwright/test';
import { enterSalesWorkspace, taskCard } from './helpers/app';
import { advanceToStep, fillTask, submitTask } from './helpers/forms';

/**
 * Guardrails warn. They never correct an answer and never block a submit.
 *
 * This is a product rule, not a validation detail: the student is supposed to
 * be able to propose a deal BITE would not accept, see exactly why, and still
 * record it. An implementation that quietly clamped the number, or disabled the
 * button, would look like a bug fix and would break the thing being taught.
 */
test('a deal outside BITE guardrails warns, and is still submitted as written', async ({
  page,
}) => {
  await enterSalesWorkspace(page);
  await advanceToStep(page, 'proposal-v1');

  const card = taskCard(page, 'proposal-v1');

  // ¥150 is under the ¥165 wholesale floor, and the resulting ¥32 of unit
  // contribution is under the ¥47 floor — two separate violations.
  await fillTask(page, 'proposal-v1', { wholesale_price_yen: 150 });

  const violations = card.locator('[data-testid="guardrail"][data-severity="violation"]');
  await expect(violations.first()).toBeVisible();
  await expect(violations).toHaveCount(2);
  await expect(card.getByText('Below BITE’s minimum wholesale price')).toBeVisible();

  // The submit button is live, and the copy says so.
  const submit = card.getByTestId('task-submit');
  await expect(submit).toBeEnabled();
  await expect(card.getByText(/You can still submit this/)).toBeVisible();

  await submitTask(page, 'proposal-v1');

  // Submitted as written: the number was recorded, not corrected to the floor.
  await expect(
    card.locator('[data-field-key="wholesale_price_yen"] input'),
  ).toHaveValue('150');
  await expect(violations.first()).toBeVisible();

  // And the step still progresses — a warning is not a failure.
  await expect(page.locator('[data-step-key="unexpected-event"]')).toHaveAttribute(
    'data-step-unlocked',
    'true',
  );
});

test('QuickMart-side advice is marked advisory, not as a BITE violation', async ({
  page,
}) => {
  await enterSalesWorkspace(page);
  await advanceToStep(page, 'proposal-v1');

  const card = taskCard(page, 'proposal-v1');
  // Above QuickMart's stated ¥300 ceiling, but nothing BITE forbids.
  await fillTask(page, 'proposal-v1', { retail_price_yen: 360 });

  await expect(
    card.locator('[data-testid="guardrail"][data-severity="advisory"]'),
  ).not.toHaveCount(0);
  await expect(
    card.locator('[data-testid="guardrail"][data-severity="violation"]'),
  ).toHaveCount(0);
});
