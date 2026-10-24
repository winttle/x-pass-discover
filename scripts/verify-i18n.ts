/**
 * Translation coverage.
 *
 *   npm run verify:i18n
 *
 * Interface strings are type-checked: `ja.ts` and `ko.ts` cannot leave out a
 * key of `en.ts`. Scenario content cannot be, because its translations are
 * overlays addressed by content keys (see `src/content/localize.ts`). This
 * walks every English source that HAS a translation and fails when:
 *
 *   - a string the student reads has no translation (it would show in English),
 *   - an overlay names a step, task, field, option, resource or fact that no
 *     longer exists (the English moved on and the translation did not),
 *   - a list (facts, table rows) has a different length or shape,
 *   - a prefill template lost or gained a `{{task.field}}` placeholder,
 *   - a dictionary message lost or gained a `{name}` placeholder.
 *
 * A scenario with no translation at all is reported, not failed: it is shown
 * in English, which is a decision rather than a mistake.
 */
import { DEPARTMENTS } from '@/content/departments';
import { DEPARTMENT_TRANSLATIONS } from '@/content/departments.i18n';
import type { FieldText, ScenarioText, StepText, TaskText } from '@/content/localize';
import {
  PERSONA_TRANSLATIONS_BY_SCENARIO,
  listPersonas,
} from '@/content/personas.server';
import {
  TRANSLATIONS_BY_SCENARIO,
  listResources,
  listScenarios,
} from '@/content/registry';
import { LOCALES, type Locale } from '@/i18n/config';
import { DICTIONARIES } from '@/i18n/translate';
import type { TaskDefinition, TaskField } from '@/types/scenario';

const problems: string[] = [];
const notes: string[] = [];

const OTHER_LOCALES = LOCALES.filter((l): l is Exclude<Locale, 'en'> => l !== 'en');

function need(where: string, english: string | undefined, translated: string | undefined) {
  if (english === undefined || english === '') return;
  if (translated === undefined || translated.trim() === '') {
    problems.push(`${where}: missing translation of ${JSON.stringify(clip(english))}`);
  }
}

function stale(where: string, keys: string[] | undefined, known: string[]) {
  for (const key of keys ?? []) {
    if (!known.includes(key)) problems.push(`${where}: "${key}" does not exist in the English`);
  }
}

function sameLength(where: string, english: unknown[] | undefined, translated: unknown[] | undefined) {
  if (!english && !translated) return;
  if ((english?.length ?? 0) !== (translated?.length ?? 0)) {
    problems.push(
      `${where}: ${translated?.length ?? 0} entries, English has ${english?.length ?? 0}`,
    );
  }
}

const clip = (s: string) => (s.length > 60 ? `${s.slice(0, 57)}…` : s);

const placeholders = (s: string | undefined, pattern: RegExp) =>
  Array.from((s ?? '').matchAll(pattern), (m) => m[0]).sort().join(' ');

// ------------------------------------------------------------- scenarios

function checkField(where: string, field: TaskField, text: FieldText | undefined) {
  const at = `${where} › ${field.key}`;
  need(`${at} label`, field.label, text?.label);
  need(`${at} helpText`, field.helpText, text?.helpText);
  need(`${at} placeholder`, field.placeholder, text?.placeholder);

  if (field.prefillTemplate && /[A-Za-z]{2,}/.test(field.prefillTemplate.replace(/\{\{[^}]*\}\}/g, ''))) {
    need(`${at} prefillTemplate`, field.prefillTemplate, text?.prefillTemplate);
  }
  if (text?.prefillTemplate) {
    const pattern = /\{\{[^}]*\}\}/g;
    if (placeholders(field.prefillTemplate, pattern) !== placeholders(text.prefillTemplate, pattern)) {
      problems.push(`${at} prefillTemplate: placeholders differ from the English`);
    }
  }

  const values = (field.options ?? []).map((o) => o.value);
  for (const option of field.options ?? []) {
    need(`${at} option ${option.value}`, option.label, text?.options?.[option.value]);
  }
  stale(`${at} options`, Object.keys(text?.options ?? {}), values);

  const subKeys = (field.fields ?? []).map((f) => f.key);
  for (const sub of field.fields ?? []) checkField(at, sub, text?.fields?.[sub.key]);
  stale(`${at} fields`, Object.keys(text?.fields ?? {}), subKeys);
}

function checkTask(where: string, task: TaskDefinition, text: TaskText | undefined) {
  const at = `${where} › ${task.key}`;
  need(`${at} title`, task.title, text?.title);
  need(`${at} instructions`, task.instructions, text?.instructions);
  const keys = (task.fields ?? []).map((f) => f.key);
  for (const field of task.fields ?? []) checkField(at, field, text?.fields?.[field.key]);
  stale(`${at} fields`, Object.keys(text?.fields ?? {}), keys);
}

function checkFacts(
  where: string,
  english: Array<{ label: string; value: string }> | undefined,
  translated: Array<{ label: string; value: string }> | undefined,
) {
  sameLength(where, english, translated);
  english?.forEach((fact, index) => {
    need(`${where}[${index}] label`, fact.label, translated?.[index]?.label);
    need(`${where}[${index}] value`, fact.value, translated?.[index]?.value);
  });
}

for (const scenario of listScenarios()) {
  const translations = TRANSLATIONS_BY_SCENARIO[scenario.scenarioKey];
  const resources = listResources(scenario.scenarioKey);
  const personas = listPersonas(scenario.scenarioKey);

  for (const locale of OTHER_LOCALES) {
    const text: ScenarioText | undefined = translations?.scenario?.[locale];
    const where = `${scenario.scenarioKey} v${scenario.version} [${locale}]`;
    if (!text) {
      notes.push(`${where}: no translation, shown in English`);
      continue;
    }

    need(`${where} title`, scenario.title, text.title);
    need(`${where} studentRole`, scenario.studentRole, text.studentRole);
    need(`${where} mission`, scenario.mission, text.mission);
    need(`${where} finalOutputTitle`, scenario.finalOutputTitle, text.finalOutputTitle);

    for (const step of scenario.steps) {
      const s: StepText | undefined = text.steps?.[step.key];
      const at = `${where} › ${step.key}`;
      need(`${at} title`, step.title, s?.title);
      need(`${at} summary`, step.summary, s?.summary);
      need(`${at} instructions`, step.instructions, s?.instructions);
      if (step.media) {
        need(`${at} media alt`, step.media.alt, s?.media?.alt);
        need(`${at} media title`, step.media.title, s?.media?.title);
        need(`${at} media caption`, step.media.caption, s?.media?.caption);
        checkFacts(`${at} media facts`, step.media.facts, s?.media?.facts);
      }
      if (step.eventPayload) {
        need(`${at} event headline`, step.eventPayload.headline, s?.eventPayload?.headline);
        need(`${at} event from`, step.eventPayload.from, s?.eventPayload?.from);
        need(`${at} event body`, step.eventPayload.body, s?.eventPayload?.body);
        checkFacts(`${at} event facts`, step.eventPayload.facts, s?.eventPayload?.facts);
      }
      const taskKeys = step.tasks.map((t) => t.key);
      for (const task of step.tasks) checkTask(at, task, s?.tasks?.[task.key]);
      stale(`${at} tasks`, Object.keys(s?.tasks ?? {}), taskKeys);
    }
    stale(`${where} steps`, Object.keys(text.steps ?? {}), scenario.steps.map((s) => s.key));

    // Data Room
    const byKey = translations?.resources?.[locale];
    for (const resource of resources) {
      const r = byKey?.[resource.key];
      const at = `${scenario.scenarioKey} resource ${resource.key} [${locale}]`;
      need(`${at} title`, resource.title, r?.title);
      need(`${at} description`, resource.description, r?.description);
      need(`${at} file detail`, resource.fileMeta?.detail, r?.fileDetail);
      need(`${at} image alt`, resource.image?.alt, r?.imageAlt);
      const body = resource.body;
      if (body.kind === 'markdown') need(`${at} markdown`, body.markdown, r?.markdown);
      if (body.kind === 'table') {
        sameLength(`${at} columns`, body.columns, r?.columns);
        sameLength(`${at} rows`, body.rows, r?.rows);
        body.rows.forEach((row, index) =>
          sameLength(`${at} row ${index}`, row, r?.rows?.[index]),
        );
        need(`${at} note`, body.note, r?.note);
        if (!r?.columns) problems.push(`${at}: table has no translated columns`);
      }
    }
    stale(
      `${scenario.scenarioKey} resources [${locale}]`,
      Object.keys(byKey ?? {}),
      resources.map((r) => r.key),
    );

    // Personas: what the student reads of them
    const personaText = PERSONA_TRANSLATIONS_BY_SCENARIO[scenario.scenarioKey]?.[locale];
    for (const persona of personas) {
      const p = personaText?.[persona.key];
      const at = `${scenario.scenarioKey} persona ${persona.key} [${locale}]`;
      need(`${at} role`, persona.role, p?.role);
      need(`${at} visibleContext`, persona.visibleContext, p?.visibleContext);
      need(`${at} openingMessage`, persona.openingMessage, p?.openingMessage);
      for (const fact of persona.facts) {
        need(`${at} fact ${fact.id} label`, fact.label, p?.factLabels?.[fact.id]);
      }
      stale(
        `${at} factLabels`,
        Object.keys(p?.factLabels ?? {}),
        persona.facts.map((f) => f.id),
      );
    }
    stale(
      `${scenario.scenarioKey} personas [${locale}]`,
      Object.keys(personaText ?? {}),
      personas.map((p) => p.key),
    );
  }
}

// ----------------------------------------------------------- departments

for (const locale of OTHER_LOCALES) {
  const byKey = DEPARTMENT_TRANSLATIONS[locale];
  if (!byKey) {
    notes.push(`departments [${locale}]: no translation, shown in English`);
    continue;
  }
  for (const d of DEPARTMENTS) {
    const t = byKey[d.slug];
    const at = `department ${d.slug} [${locale}]`;
    need(`${at} name`, d.name, t?.name);
    need(`${at} tagline`, d.tagline, t?.tagline);
    need(`${at} description`, d.description, t?.description);
    need(`${at} projectTitle`, d.projectTitle, t?.projectTitle);
    need(`${at} coreQuestion`, d.coreQuestion, t?.coreQuestion);
    need(`${at} finalOutput`, d.finalOutput, t?.finalOutput);
  }
  stale(`departments [${locale}]`, Object.keys(byKey), DEPARTMENTS.map((d) => d.slug));
}

// ---------------------------------------------------------- dictionaries

const VAR = /\{\w+\}/g;
for (const locale of OTHER_LOCALES) {
  for (const [key, english] of Object.entries(DICTIONARIES.en)) {
    const translated = DICTIONARIES[locale][key as keyof typeof DICTIONARIES.en];
    if (placeholders(english, VAR) !== placeholders(translated, VAR)) {
      problems.push(`messages ${locale} "${key}": placeholders differ from the English`);
    }
  }
}

// ---------------------------------------------------------------- report

for (const note of notes) console.log(`  · ${note}`);
if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} translation problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('✓ translations cover their English sources');
