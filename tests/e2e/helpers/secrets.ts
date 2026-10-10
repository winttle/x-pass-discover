import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ARTIFACTS_DIR = join(process.cwd(), 'tests', 'e2e', '.artifacts');
export const SERVER_SECRETS_PATH = join(ARTIFACTS_DIR, 'server-secrets.json');

export type Secret = { label: string; text: string };

/**
 * Server-only persona data, split by where it is allowed to appear.
 *
 * The split is not a loophole — it is the actual rule. The student app may
 * never see any of this. `/admin/ai-personas` deliberately shows the
 * disclosure *wiring* (rules and trigger topics) so disclosure behaviour can
 * be debugged, while withholding the fact content and the prompts. Keeping the
 * two lists apart is what lets a test assert the strict rule on the student
 * surface instead of weakening it to whatever admin happens to render.
 */
export type ServerSecrets = {
  /** Never serialised to any browser, admin included. */
  neverAnywhere: Secret[];
  /** Never in the student app; `/admin/ai-personas` shows these by design. */
  neverInStudentApp: Secret[];
  /** Only legitimate in the student app once the student has earned them. */
  hiddenFacts: Array<{
    personaKey: string;
    factId: string;
    label: string;
    content: string;
  }>;
};

export function loadServerSecrets(): ServerSecrets {
  return JSON.parse(readFileSync(SERVER_SECRETS_PATH, 'utf8')) as ServerSecrets;
}

/** Hidden fact content, in the shape the leak assertions take. */
export function hiddenFactSecrets(secrets: ServerSecrets): Secret[] {
  return secrets.hiddenFacts.map((fact) => ({
    label: `${fact.personaKey}.${fact.factId} content`,
    text: fact.content.slice(0, 60),
  }));
}
