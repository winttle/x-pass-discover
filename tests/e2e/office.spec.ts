import { expect, test } from '@playwright/test';
import { signUpAsNewStudent } from './helpers/app';

/**
 * The 2.5D office is the experience layer and nothing else. It is checked here
 * for the one thing it owes the rest of the app: that it boots, renders, and
 * raises its proximity prompt when the player walks up to someone — not for
 * business state, which it must never hold.
 *
 * Headless CI has no GPU, and the office renders roughly a million pixels a
 * frame in a software rasteriser, so this stays a smoke test on purpose.
 */

/**
 * Phaser moves on held keys, so a tap would barely shift the player. Keys are
 * screen-relative in the isometric view: a single arrow walks a grid diagonal,
 * and a pair walks along one grid axis — up + right is due north.
 */
async function walk(
  page: Parameters<typeof signUpAsNewStudent>[0],
  keys: string[],
  ms: number,
): Promise<void> {
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  for (const key of keys) await page.keyboard.up(key);
}

test('the office boots and its prompt follows the player', async ({ page }) => {
  await signUpAsNewStudent(page, 'Office Visitor');

  await page.goto('/office');
  // The game's canvas — the lobby intro paints into a canvas of its own.
  const canvas = page.getByTestId('office-canvas').locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });

  // Phaser has to have produced a real drawing surface, not a zero-size one.
  const size = await canvas.evaluate((node) => ({
    width: (node as HTMLCanvasElement).width,
    height: (node as HTMLCanvasElement).height,
  }));
  expect(size.width).toBeGreaterThan(0);
  expect(size.height).toBeGreaterThan(0);

  // A first visit opens on the lobby intro; step through it into the office.
  const intro = page.getByTestId('office-intro');
  await expect(intro).toBeVisible();
  for (let step = 0; step < 4; step += 1) {
    await page.getByTestId('office-intro-next').click();
  }
  await expect(intro).toHaveCount(0);

  const prompt = page.getByTestId('office-prompt');
  // The player spawns just outside the reception desk's interaction radius.
  await expect(prompt).toHaveCount(0);

  await canvas.click();

  // Reception is one tile north of the spawn point.
  await walk(page, ['ArrowUp', 'ArrowRight'], 400);
  await expect(prompt, 'walking up to reception should offer an interaction').toBeVisible({
    timeout: 20_000,
  });
  await expect(prompt).toContainText('Talk');

  // And walking away takes it back — the prompt tracks proximity, it does not
  // latch on the first time something is near.
  await walk(page, ['ArrowDown', 'ArrowLeft'], 900);
  await expect(prompt).toHaveCount(0);
});
