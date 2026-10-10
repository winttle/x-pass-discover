import { expect, test } from '@playwright/test';
import { enterSalesWorkspace, taskCard } from './helpers/app';
import { advanceToStep, holdConversation } from './helpers/forms';

/**
 * A meeting cannot be ended before it has been held.
 *
 * This used to be reachable, and it was a dead end rather than a cosmetic
 * glitch: the minimum number of questions only existed on the live conversation
 * state, which is null until the student opens one, so "End meeting" was live
 * on the first render. Ending there sealed the conversation — the step's
 * completion rule still wanted five questions, the ended conversation would not
 * take any more, and the bootcamp could not be finished.
 */
test('the meeting cannot be ended before the questions have been asked', async ({
  page,
}) => {
  const sessionId = await enterSalesWorkspace(page);
  await advanceToStep(page, 'buyer-meeting');

  const card = taskCard(page, 'buyer-meeting-conversation');
  const end = card.getByTestId('chat-end');

  // The button is not offered before the minimum is met...
  await expect(end).toBeVisible();
  await expect(end).toBeDisabled();
  await expect(card.getByText(/more questions? before you can end this/)).toBeVisible();

  // ...and the endpoint refuses it too, so a disabled button is not the only
  // thing standing between a student and an unfinishable session.
  const refused = await page.request.post(`/api/sessions/${sessionId}/conversations`, {
    data: {
      personaKey: 'quickmart-buyer',
      stepKey: 'buyer-meeting',
      action: 'end',
    },
  });
  expect(refused.status()).toBe(400);
  expect(await refused.json()).toMatchObject({
    error: expect.stringContaining('before ending this conversation'),
  });

  // The conversation survived the refusal and can still be held properly.
  await page.reload();
  await holdConversation(page, 'buyer-meeting-conversation');
  await expect(page.locator('[data-step-key="needs-analysis"]')).toHaveAttribute(
    'data-step-unlocked',
    'true',
  );
});
