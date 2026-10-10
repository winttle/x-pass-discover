import { expect, type Locator, type Page } from '@playwright/test';
import { openStep, taskCard } from './app';

/**
 * Fills whatever a task renders, from the field metadata in the DOM.
 *
 * `DynamicForm` builds every structured task in every department from field
 * definitions, so the test that drives it is written the same way: it reads
 * `data-field-type` and fills accordingly instead of naming the Sales fields
 * one by one. When Marketing or HR is authored, these helpers already work —
 * which is the same claim the architecture makes about the engine, now checked
 * by something other than reading the code.
 */

export type FieldValue = string | number;

/**
 * Deal numbers that satisfy every BITE guardrail, so a walkthrough that is not
 * about guardrails does not trip one by accident. Wholesale ¥180 clears the
 * ¥165 floor and leaves ¥62 of unit contribution against a ¥47 floor; retail
 * ¥280 is under QuickMart's ¥300 ceiling at a 35.7% retail margin.
 */
const COMPLIANT_NUMBERS: Record<string, number> = {
  store_count: 30,
  initial_quantity: 3000,
  wholesale_price_yen: 180,
  retail_price_yen: 280,
  extra_promotion_yen: 8,
  sales_target_units_per_store_per_day: 3,
  payment_terms_days: 30,
};

function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function defaultText(key: string): string {
  return `${humanize(key)} — written by the end-to-end walkthrough.`;
}

async function numberFor(input: Locator, key: string): Promise<number> {
  if (key in COMPLIANT_NUMBERS) return COMPLIANT_NUMBERS[key];
  // Unknown numeric field (a department authored after this helper): stay
  // inside whatever range the content declared.
  const min = Number(await input.getAttribute('min'));
  const max = Number(await input.getAttribute('max'));
  if (Number.isFinite(min) && min > 0) return min;
  if (Number.isFinite(max) && max > 0) return Math.min(max, 10);
  return 10;
}

/**
 * Fills one field, given the element that carries its `data-field-*` hooks.
 * `suffix` distinguishes rows of a repeatable group and only ever reaches free
 * text — appending it to a select value would look for an option that is not
 * there.
 */
async function fillField(
  scope: Locator,
  key: string,
  type: string,
  overrides: Record<string, FieldValue>,
  suffix = '',
): Promise<void> {
  const override = overrides[key];

  switch (type) {
    case 'number': {
      const input = scope.locator('input[type="number"]').first();
      const value = override ?? (await numberFor(input, key));
      await input.fill(String(value));
      return;
    }

    case 'select': {
      const select = scope.locator('select').first();
      const value =
        override ??
        (await select
          .locator('option')
          .evaluateAll((options) =>
            options
              .map((option) => (option as HTMLOptionElement).value)
              .find((v) => v !== ''),
          ));
      if (value === undefined) return;
      await select.selectOption(String(value));
      return;
    }

    case 'multi_select':
    case 'resource_evidence': {
      const options = scope.locator('[data-option-value]');
      const count = await options.count();
      // `resource_evidence` is legitimately empty until the student has opened
      // something to cite. The field is optional, so an empty list is not a
      // failure.
      if (count === 0) return;
      const option =
        override === undefined
          ? options.first()
          : scope.locator(`[data-option-value="${override}"]`);
      await option.click();
      return;
    }

    case 'textarea':
    case 'text':
    default: {
      const input = scope.locator('textarea, input[type="text"]').first();
      await input.fill(`${override ?? defaultText(key)}${suffix}`);
      return;
    }
  }
}

async function fillRepeatableGroup(
  group: Locator,
  overrides: Record<string, FieldValue>,
): Promise<void> {
  const rows = group.locator('[data-row-index]');
  const rowCount = await rows.count();
  for (let r = 0; r < rowCount; r += 1) {
    const row = rows.nth(r);
    const fields = row.locator('[data-field-scope="row"]');
    const fieldCount = await fields.count();
    for (let f = 0; f < fieldCount; f += 1) {
      const field = fields.nth(f);
      const key = (await field.getAttribute('data-field-key')) ?? '';
      const type = (await field.getAttribute('data-field-type')) ?? 'text';
      // Rows of the same group would otherwise read identically; the index
      // makes each one distinguishable in the stored answer.
      await fillField(field, key, type, overrides, ` (#${r + 1})`);
    }
  }
}

/**
 * Fills every field of a task and asserts nothing required is left over.
 * That assertion is the point: it proves the generic filler actually satisfied
 * the form rather than silently skipping a field type it did not understand.
 */
export async function fillTask(
  page: Page,
  taskKey: string,
  overrides: Record<string, FieldValue> = {},
): Promise<void> {
  const card = taskCard(page, taskKey);
  await expect(card).toBeVisible();

  const fields = card.locator('[data-field-scope="task"]');
  const count = await fields.count();
  for (let i = 0; i < count; i += 1) {
    const field = fields.nth(i);
    const key = (await field.getAttribute('data-field-key')) ?? '';
    const type = (await field.getAttribute('data-field-type')) ?? 'text';
    if (type === 'repeatable_group') {
      await fillRepeatableGroup(field, overrides);
    } else {
      await fillField(field, key, type, overrides);
    }
  }

  await expect(
    card.getByTestId('missing-required'),
    `task "${taskKey}" still reports missing required fields after being filled`,
  ).toHaveCount(0);
}

/** Submits a task and waits for the server to report it complete. */
export async function submitTask(page: Page, taskKey: string): Promise<void> {
  const card = taskCard(page, taskKey);
  await card.getByTestId('task-submit').click();
  await expect(card).toHaveAttribute('data-task-status', 'complete');
}

export async function fillAndSubmit(
  page: Page,
  taskKey: string,
  overrides: Record<string, FieldValue> = {},
): Promise<void> {
  await fillTask(page, taskKey, overrides);
  await submitTask(page, taskKey);
}

/** Marks an `acknowledge` task complete. */
export async function acknowledge(page: Page, taskKey: string): Promise<void> {
  const card = taskCard(page, taskKey);
  await card.getByTestId('acknowledge').click();
  await expect(card).toHaveAttribute('data-task-status', 'complete');
}

/**
 * Questions a student might actually ask the QuickMart buyer. The first two
 * are deliberately vague and the rest are specific, which is also the shape the
 * discovery mechanic is supposed to reward — see `discovery.spec.ts`.
 */
export const BUYER_QUESTIONS = [
  'Could you tell me a bit about QuickMart?',
  'What matters most to you this year?',
  'How many units per store per day do comparable protein drinks sell in the morning?',
  'What retail margin do you need on a new beverage?',
  'How many stores would a pilot run in, and for how long?',
  'What would make you discontinue a product after the pilot?',
  'How much shelf space could a new protein drink get?',
  'What payment terms do you normally work with?',
];

/**
 * Talks until the task's own minimum is satisfied, then ends the conversation.
 * The minimum comes from the scenario content, so the helper reads it off the
 * UI (the End button stays disabled until it is met) rather than hard-coding a
 * number that only happens to be right for Sales today.
 */
export async function holdConversation(
  page: Page,
  taskKey: string,
  questions: string[] = BUYER_QUESTIONS,
): Promise<void> {
  const card = taskCard(page, taskKey);
  const input = card.getByTestId('chat-input');
  const end = card.getByTestId('chat-end');
  await expect(input).toBeVisible();

  const MAX_TURNS = 15;
  for (let turn = 0; turn < MAX_TURNS; turn += 1) {
    if (await end.isEnabled()) break;
    const before = await card.getByTestId('chat-message').count();
    await input.fill(questions[turn % questions.length]);
    await card.getByTestId('chat-send').click();
    // The student's line and the reply both land before the next question.
    await expect(card.getByTestId('chat-message')).toHaveCount(before + 2);
  }

  await expect(
    end,
    `conversation "${taskKey}" never reached its minimum number of questions`,
  ).toBeEnabled();
  await end.click();
  await expect(card).toHaveAttribute('data-task-status', 'complete');
}

/**
 * Completes whatever the step currently on screen renders, whichever kinds of
 * task that turns out to be. The scenario engine does not know about Sales, so
 * neither does this.
 */
export async function completeCurrentStep(page: Page): Promise<string[]> {
  const cards = page.locator('[data-task-key]');
  const done: string[] = [];
  const total = await cards.count();

  for (let i = 0; i < total; i += 1) {
    const card = cards.nth(i);
    const key = (await card.getAttribute('data-task-key')) ?? '';
    const kind = (await card.getAttribute('data-task-kind')) ?? '';
    const required = (await card.getAttribute('data-task-required')) === 'true';
    const status = await card.getAttribute('data-task-status');
    // Optional tasks are skipped on purpose: a step must be completable
    // without them, and that is worth proving rather than assuming.
    if (!required) continue;
    // Already done — walking past a step a spec has already worked on must not
    // silently rewrite the answers it left there.
    if (status === 'complete') {
      done.push(key);
      continue;
    }

    if (kind === 'acknowledge') {
      await acknowledge(page, key);
    } else if (kind === 'ai_conversation') {
      await holdConversation(page, key);
    } else {
      await fillAndSubmit(page, key);
    }
    done.push(key);
  }

  return done;
}

/**
 * Completes steps in rail order until `stepKey` is open and ready to work on.
 * Specs about one late step use this instead of restating the walkthrough.
 */
export async function advanceToStep(page: Page, stepKey: string): Promise<void> {
  const stepKeys = await page
    .locator('[data-step-key]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-step-key') ?? ''));

  const target = stepKeys.indexOf(stepKey);
  if (target === -1) {
    throw new Error(`no step "${stepKey}" in this scenario (${stepKeys.join(', ')})`);
  }

  for (const key of stepKeys.slice(0, target)) {
    await openStep(page, key);
    await completeCurrentStep(page);
  }
  await openStep(page, stepKey);
}
