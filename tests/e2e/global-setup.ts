import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SERVER_SECRETS_PATH } from './helpers/secrets';

/**
 * Produces the list of server-only strings the leak spec asserts against,
 * before any test runs. It is generated rather than committed so it can never
 * drift from the content it is derived from.
 */
export default function globalSetup() {
  mkdirSync(dirname(SERVER_SECRETS_PATH), { recursive: true });
  const output = execFileSync(
    'npx',
    [
      'tsx',
      '--conditions=react-server',
      'tests/e2e/fixtures/dump-server-secrets.ts',
      SERVER_SECRETS_PATH,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  process.stdout.write(output);
}
