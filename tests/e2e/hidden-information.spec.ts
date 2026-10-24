import { expect, test, type Page } from '@playwright/test';
import { enterSalesWorkspace, openStep, taskCard } from './helpers/app';
import { completeCurrentStep } from './helpers/forms';
import { ReceivedTraffic } from './helpers/leak-scan';
import { hiddenFactSecrets, loadServerSecrets } from './helpers/secrets';

/**
 * The non-negotiable: hidden AI persona information never reaches the browser.
 *
 * `server-only` guards the module graph — it makes importing a persona file
 * from a client component a build error. It does not guard a *payload*: an API
 * route could serialise a system prompt or an unearned fact into JSON and
 * `server-only` would be perfectly happy. That gap is what this spec covers.
 *
 * The strings come from the real content files via the global setup, so a new
 * persona or a new hidden fact is covered without anyone remembering to add it
 * here.
 */

const secrets = loadServerSecrets();

/** Walks the rail until a conversation task is on screen, and returns its key. */
async function reachConversation(
  page: Page,
  traffic?: ReceivedTraffic,
): Promise<string> {
  const stepKeys = await page
    .locator('[data-step-key]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-step-key') ?? ''));

  for (const stepKey of stepKeys) {
    await openStep(page, stepKey);
    if (traffic) await traffic.snapshotDom(page, `step ${stepKey}`);
    const conversation = page.locator('[data-task-kind="ai_conversation"]').first();
    if (await conversation.count()) {
      return (await conversation.getAttribute('data-task-key')) ?? '';
    }
    await completeCurrentStep(page);
  }
  return '';
}

test('prompts, conversation rules and disclosure rules never reach the student app', async ({
  page,
}) => {
  const traffic = new ReceivedTraffic(page);

  await enterSalesWorkspace(page);
  const conversationTaskKey = await reachConversation(page, traffic);
  expect(conversationTaskKey, 'the scenario should contain a conversation').not.toBe('');

  // Actually talk, because the conversation response is the payload that
  // carries the real risk — not the pages that exist before one is open.
  const card = taskCard(page, conversationTaskKey);
  await card.getByTestId('chat-input').fill('What matters most to you about this category?');
  await card.getByTestId('chat-send').click();
  await expect(card.getByTestId('chat-message')).toHaveCount(3);
  await traffic.snapshotDom(page, 'after one conversation turn');

  await traffic.assertAbsent([
    ...secrets.neverAnywhere,
    ...secrets.neverInStudentApp,
  ]);
});

test('a hidden fact stays hidden until a question earns it', async ({ page }) => {
  const traffic = new ReceivedTraffic(page);

  await enterSalesWorkspace(page);
  const conversationTaskKey = await reachConversation(page);
  expect(conversationTaskKey).not.toBe('');

  const card = taskCard(page, conversationTaskKey);
  const meter = card.getByTestId('discovery-meter');
  await expect(meter).toHaveAttribute('data-found', '0');

  // Nothing earned yet, so no hidden fact may have been sent yet either.
  await traffic.assertAbsent(hiddenFactSecrets(secrets));

  // A question that is only polite earns nothing. This is the behaviour the
  // product rests on: discovery is a reward for asking well, not a timer.
  await card.getByTestId('chat-input').fill('Could you tell me about QuickMart?');
  await card.getByTestId('chat-send').click();
  await expect(card.getByTestId('chat-message')).toHaveCount(3);
  await expect(
    meter,
    'a vague question must not disclose a specific',
  ).toHaveAttribute('data-found', '0');
  await traffic.assertAbsent(hiddenFactSecrets(secrets));

  // A question about something the buyer actually knows does earn it.
  await card
    .getByTestId('chat-input')
    .fill('How many units per store per day do protein drinks sell in the morning?');
  await card.getByTestId('chat-send').click();
  await expect
    .poll(async () => Number(await meter.getAttribute('data-found')), {
      message: 'a specific, on-topic question should uncover a specific',
      timeout: 20_000,
    })
    .toBeGreaterThan(0);

  // Something was genuinely disclosed — otherwise the assertions above would
  // hold for a chat that simply never says anything.
  await traffic.settle();
  const earned = secrets.hiddenFacts.some((fact) =>
    traffic.present(fact.content.slice(0, 40)),
  );
  expect(earned, 'the disclosed fact should now be in the transcript').toBe(true);

  // Even now, every rule that governs the ledger stays on the server.
  await traffic.assertAbsent([
    ...secrets.neverAnywhere,
    ...secrets.neverInStudentApp,
  ]);
});
