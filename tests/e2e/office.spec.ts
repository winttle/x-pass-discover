import { expect, test } from '@playwright/test';
import { signInAsNewStudent } from './helpers/app';

/**
 * The 2D office is the experience layer and nothing else. It is checked here
 * for the one thing it owes the rest of the app: that it boots, renders, and
 * raises its proximity prompt when the player walks up to someone — not for
 * business state, which it must never hold.
 *
 * Headless CI has no GPU, and the office renders roughly a million pixels a
 * frame in a software rasteriser, so this stays a smoke test on purpose.
 */

/** Phaser moves on held keys, so a tap would barely shift the player. */
async function walk(
  page: Parameters<typeof signInAsNewStudent>[0],
  key: string,
  ms: number,
): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

test('the office boots and its prompt follows the player', async ({ page }) => {
  await signInAsNewStudent(page, 'Office Visitor');

  await page.goto('/office');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });

  // Phaser has to have produced a real drawing surface, not a zero-size one.
  const size = await canvas.evaluate((node) => ({
    width: (node as HTMLCanvasElement).width,
    height: (node as HTMLCanvasElement).height,
  }));
  expect(size.width).toBeGreaterThan(0);
  expect(size.height).toBeGreaterThan(0);

  const prompt = page.getByTestId('office-prompt');
  // The player spawns just outside the reception desk's interaction radius.
  await expect(prompt).toHaveCount(0);

  await canvas.click();

  // Reception is one tile north of the spawn point.
  await walk(page, 'ArrowUp', 400);
  await expect(prompt, 'walking up to reception should offer an interaction').toBeVisible({
    timeout: 20_000,
  });
  await expect(prompt).toContainText('Talk');

  // And walking away takes it back — the prompt tracks proximity, it does not
  // latch on the first time something is near.
  await walk(page, 'ArrowDown', 900);
  await expect(prompt).toHaveCount(0);
});
