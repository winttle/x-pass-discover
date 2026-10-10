/**
 * Dumps the persona data that must not reach a browser, for the leak spec.
 *
 * `src/content/**\/personas.server.ts` is `server-only`, which throws the
 * moment it is imported outside a react-server condition — so this runs under
 * `tsx --conditions=react-server`, exactly like the other verification
 * scripts, and is invoked from the Playwright global setup.
 *
 * Deriving the list from the real content, rather than hard-coding a few
 * phrases in a spec, is the point: a new department, a new persona or a new
 * hidden fact is covered the day it is written, with no test to remember to
 * update.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { listScenarios } from '@/content/registry';
import { listPersonas } from '@/content/personas.server';
import type { ServerSecrets } from '../helpers/secrets';

/**
 * Long prose is fingerprinted rather than compared whole: a leak could arrive
 * re-wrapped or partially escaped, and a distinctive sentence survives that
 * where the full blob would not.
 */
function fingerprints(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\s]+/, '').trim())
    .filter((line) => line.length >= 40)
    .map((line) => line.slice(0, 60));
}

function collect(): ServerSecrets {
  const neverAnywhere: ServerSecrets['neverAnywhere'] = [];
  const neverInStudentApp: ServerSecrets['neverInStudentApp'] = [];
  const hiddenFacts: ServerSecrets['hiddenFacts'] = [];

  for (const scenario of listScenarios()) {
    for (const persona of listPersonas(scenario.scenarioKey)) {
      for (const text of fingerprints(persona.systemPrompt)) {
        neverAnywhere.push({ label: `${persona.key}.systemPrompt`, text });
      }
      for (const text of fingerprints(persona.conversationRules)) {
        neverAnywhere.push({ label: `${persona.key}.conversationRules`, text });
      }
      for (const fact of persona.facts) {
        for (const text of fingerprints(fact.disclosureRule)) {
          neverInStudentApp.push({
            label: `${persona.key}.${fact.id}.disclosureRule`,
            text,
          });
        }
        if (fact.visibility === 'hidden') {
          hiddenFacts.push({
            personaKey: persona.key,
            factId: fact.id,
            label: fact.label,
            content: fact.content,
          });
        }
      }
    }
  }

  return { neverAnywhere, neverInStudentApp, hiddenFacts };
}

const [outPath] = process.argv.slice(2);
if (!outPath) {
  console.error('usage: dump-server-secrets.ts <output.json>');
  process.exit(1);
}

const secrets = collect();
if (secrets.neverAnywhere.length === 0 || secrets.hiddenFacts.length === 0) {
  console.error(
    'Refusing to write an empty secret list — the leak spec would pass vacuously.',
  );
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(secrets, null, 2));
console.log(
  `server secrets: ${secrets.neverAnywhere.length} never-anywhere strings, ` +
    `${secrets.neverInStudentApp.length} student-app-forbidden strings, ` +
    `${secrets.hiddenFacts.length} hidden facts`,
);
