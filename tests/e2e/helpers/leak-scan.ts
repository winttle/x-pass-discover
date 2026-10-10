import { expect, type Page } from '@playwright/test';
import type { Secret } from './secrets';

/** How long to wait for one response body before giving up on it. */
const BODY_TIMEOUT_MS = 5_000;

/**
 * Records everything the browser received, so a payload can be searched for
 * strings that were never supposed to leave the server.
 *
 * Scanning responses matters as much as scanning the DOM: a secret serialised
 * into a JSON body has already left the server whether or not anything renders
 * it, and that is precisely the failure `server-only` cannot catch.
 */
export class ReceivedTraffic {
  private readonly bodies: string[] = [];
  private readonly sources: string[] = [];
  private pending = 0;

  constructor(page: Page) {
    page.on('response', (response) => {
      const type = response.headers()['content-type'] ?? '';
      if (!/json|text|javascript|html/.test(type)) return;
      this.pending += 1;
      void Promise.race([
        response.text(),
        // A streaming response (an RSC flight for a navigation still in
        // progress, say) can leave `text()` pending forever. Bound it, or
        // `settle()` would wait on a body that is never going to arrive.
        new Promise<null>((resolve) => setTimeout(() => resolve(null), BODY_TIMEOUT_MS)),
      ])
        .then((body) => {
          if (body === null) return;
          this.record(body, `${response.request().method()} ${response.url()}`);
        })
        .catch(() => {
          // A body can also be gone by the time we ask (redirect, abort).
          // Losing one is acceptable — the DOM snapshots still cover whatever
          // the page actually rendered.
        })
        .finally(() => {
          this.pending -= 1;
        });
    });
  }

  record(body: string, source: string): void {
    this.bodies.push(body);
    this.sources.push(source);
  }

  /** Snapshots the rendered DOM, which catches anything inlined by the server. */
  async snapshotDom(page: Page, label: string): Promise<void> {
    this.record(await page.content(), `DOM: ${label}`);
  }

  get size(): number {
    return this.bodies.length;
  }

  /** Waits for in-flight response bodies so nothing is scanned too early. */
  async settle(): Promise<void> {
    await expect
      .poll(() => this.pending, { timeout: BODY_TIMEOUT_MS * 3 })
      .toBe(0);
  }

  async assertAbsent(secrets: Secret[]): Promise<void> {
    await this.settle();
    expect(secrets.length, 'an empty secret list would pass vacuously').toBeGreaterThan(0);
    expect(this.size, 'nothing was captured, so nothing was checked').toBeGreaterThan(0);

    const leaks: string[] = [];
    for (const secret of secrets) {
      const index = this.bodies.findIndex((body) => body.includes(secret.text));
      if (index !== -1) {
        leaks.push(
          `${secret.label} leaked into ${this.sources[index]}: "${secret.text.slice(0, 48)}…"`,
        );
      }
    }
    expect(leaks, `server-only data reached the browser:\n${leaks.join('\n')}`).toEqual([]);
  }

  /** Asserts a string the student HAS earned is present, to prove the scan works. */
  present(text: string): boolean {
    return this.bodies.some((body) => body.includes(text));
  }
}
