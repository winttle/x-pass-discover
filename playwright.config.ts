import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * The suite runs against a PRODUCTION build on purpose. `next start` sets
 * NODE_ENV=production, which is what makes `lib/env` pick `memory`
 * persistence — the exact adapter a credential-less Vercel deployment uses.
 * Running against `next dev` would exercise the file store instead and quietly
 * skip the demo-mode path these tests are meant to protect. It also means every
 * run starts from an empty store, so tests never inherit yesterday's sessions.
 *
 * Point E2E_BASE_URL at an already-running instance to skip the build, e.g.
 * against a preview deployment.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);
const externalURL = process.env.E2E_BASE_URL;
const baseURL = externalURL ?? `http://127.0.0.1:${PORT}`;
const isCI = !!process.env.CI;

/** The one address the production build lets into /admin. See tests/e2e/helpers. */
export const ADMIN_EMAIL = 'e2e-admin@x-pass.test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  outputDir: './tests/e2e/.artifacts/results',

  // Every spec signs in as its own generated email, so the shared store is not
  // a shared fixture and the files can run in parallel.
  fullyParallel: true,
  workers: isCI ? 2 : undefined,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI
    ? [['github'], ['html', { outputFolder: './tests/e2e/.artifacts/report', open: 'never' }]]
    : [['list']],

  // The ten-step walkthrough is one long test by design: it is the only thing
  // that proves the steps unlock in sequence against a single real session.
  timeout: 180_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Wide enough for the `xl:` three-column workspace, so the step rail
        // and the Data Room are both on screen the way a student sees them.
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: externalURL
    ? undefined
    : {
        command: `npm run build && npx next start --port ${PORT} --hostname 127.0.0.1`,
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 420_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          // Mock AI keeps the suite deterministic and credential-free. Setting
          // it explicitly means a stray OPENAI_API_KEY in the environment
          // cannot turn the tests into billable, non-deterministic API calls.
          X_PASS_AI_MODE: 'mock',
          OPENAI_API_KEY: '',
          // No DATABASE_URL: production + no URL is demo mode, which is what we
          // want to exercise. Blank it out so a developer's .env cannot point
          // the suite at a real database and write test rows into it.
          DATABASE_URL: '',
          AUTH_SECRET: 'x-pass-e2e-secret-not-used-anywhere-real',
          // /admin is closed in a production build unless an email is
          // allow-listed. One fixed address is allow-listed so the behavior-log
          // spec can open it; every other spec signs in as a generated address
          // and therefore sees admin closed, which is itself asserted.
          X_PASS_ADMIN_EMAILS: ADMIN_EMAIL,
          NEXT_PUBLIC_APP_URL: baseURL,
        },
      },
});
