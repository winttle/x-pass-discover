import type { Locale } from '@/i18n/config';
import type { ResourceDefinition } from '@/types/resource';
import type {
  DepartmentDefinition,
  ScenarioEventPayload,
  ScenarioStepMedia,
  ScenarioVersionDefinition,
  TaskDefinition,
  TaskField,
} from '@/types/scenario';

/**
 * Translations of scenario content.
 *
 * English content in `departments.ts`, `sales/scenario.ts` and
 * `sales/resources.ts` stays the source of truth: it is what the seed writes,
 * what a session pins, and what the engine evaluates. A translation is an
 * overlay addressed by the same keys (step key, task key, field key, option
 * value, resource key), applied only when a view is built for a student. Keys,
 * rules and numbers never change, so switching language can never change what
 * a step requires or how an answer is scored.
 *
 * Anything an overlay leaves out shows in English. `npm run verify:i18n` checks
 * that every overlay covers every string its source has.
 */

export type FieldText = {
  label?: string;
  helpText?: string;
  placeholder?: string;
  /** Must keep every `{{task.field}}` placeholder of the English template. */
  prefillTemplate?: string;
  /** Option label by option value. */
  options?: Record<string, string>;
  /** Row fields of a `repeatable_group`, by field key. */
  fields?: Record<string, FieldText>;
};

export type TaskText = {
  title?: string;
  instructions?: string;
  fields?: Record<string, FieldText>;
};

/** Label/value rows, in the same order as the English list. */
export type FactText = { label: string; value: string };

export type StepText = {
  title?: string;
  summary?: string;
  instructions?: string;
  media?: { alt?: string; title?: string; caption?: string; facts?: FactText[] };
  eventPayload?: { headline?: string; from?: string; body?: string; facts?: FactText[] };
  tasks?: Record<string, TaskText>;
};

export type ScenarioText = {
  title?: string;
  studentRole?: string;
  mission?: string;
  finalOutputTitle?: string;
  steps?: Record<string, StepText>;
};

export type ResourceText = {
  title?: string;
  description?: string;
  /** The file line on the card, e.g. "PDF · 4 pages". */
  fileDetail?: string;
  imageAlt?: string;
  /** `markdown` body. */
  markdown?: string;
  /** `table` body: header row, then every row, same shape as the English. */
  columns?: string[];
  rows?: Array<Array<string | number>>;
  note?: string;
};

export type DepartmentText = {
  name?: string;
  tagline?: string;
  description?: string;
  projectTitle?: string;
  coreQuestion?: string;
  finalOutput?: string;
};

/** A translation for every language but English, which is the source. */
export type Translations<T> = Partial<Record<Exclude<Locale, 'en'>, T>>;

// ------------------------------------------------------------------- apply

function localizeField(field: TaskField, text: FieldText | undefined): TaskField {
  if (!text) return field;
  return {
    ...field,
    label: text.label ?? field.label,
    helpText: text.helpText ?? field.helpText,
    placeholder: text.placeholder ?? field.placeholder,
    prefillTemplate: text.prefillTemplate ?? field.prefillTemplate,
    options: field.options?.map((option) => ({
      ...option,
      label: text.options?.[option.value] ?? option.label,
    })),
    fields: field.fields?.map((sub) => localizeField(sub, text.fields?.[sub.key])),
  };
}

function localizeTask(task: TaskDefinition, text: TaskText | undefined): TaskDefinition {
  if (!text) return task;
  return {
    ...task,
    title: text.title ?? task.title,
    instructions: text.instructions ?? task.instructions,
    fields: task.fields?.map((field) => localizeField(field, text.fields?.[field.key])),
  };
}

function localizeFacts(
  facts: Array<{ label: string; value: string }> | undefined,
  text: FactText[] | undefined,
) {
  return facts?.map((fact, index) => text?.[index] ?? fact);
}

function localizeMedia(
  media: ScenarioStepMedia | undefined,
  text: StepText['media'],
): ScenarioStepMedia | undefined {
  if (!media || !text) return media;
  return {
    ...media,
    alt: text.alt ?? media.alt,
    title: text.title ?? media.title,
    caption: text.caption ?? media.caption,
    facts: localizeFacts(media.facts, text.facts),
  };
}

function localizeEvent(
  payload: ScenarioEventPayload | undefined,
  text: StepText['eventPayload'],
): ScenarioEventPayload | undefined {
  if (!payload || !text) return payload;
  return {
    ...payload,
    headline: text.headline ?? payload.headline,
    from: text.from ?? payload.from,
    body: text.body ?? payload.body,
    facts: localizeFacts(payload.facts, text.facts),
  };
}

export function localizeScenario(
  scenario: ScenarioVersionDefinition,
  translations: Translations<ScenarioText> | undefined,
  locale: Locale,
): ScenarioVersionDefinition {
  const text = locale === 'en' ? undefined : translations?.[locale];
  if (!text) return scenario;
  return {
    ...scenario,
    title: text.title ?? scenario.title,
    studentRole: text.studentRole ?? scenario.studentRole,
    mission: text.mission ?? scenario.mission,
    finalOutputTitle: text.finalOutputTitle ?? scenario.finalOutputTitle,
    steps: scenario.steps.map((step) => {
      const stepText = text.steps?.[step.key];
      if (!stepText) return step;
      return {
        ...step,
        title: stepText.title ?? step.title,
        summary: stepText.summary ?? step.summary,
        instructions: stepText.instructions ?? step.instructions,
        media: localizeMedia(step.media, stepText.media),
        eventPayload: localizeEvent(step.eventPayload, stepText.eventPayload),
        tasks: step.tasks.map((task) => localizeTask(task, stepText.tasks?.[task.key])),
      };
    }),
  };
}

export function localizeResources(
  resources: ResourceDefinition[],
  translations: Translations<Record<string, ResourceText>> | undefined,
  locale: Locale,
): ResourceDefinition[] {
  const byKey = locale === 'en' ? undefined : translations?.[locale];
  if (!byKey) return resources;
  return resources.map((resource) => {
    const text = byKey[resource.key];
    if (!text) return resource;
    const body = resource.body;
    return {
      ...resource,
      title: text.title ?? resource.title,
      description: text.description ?? resource.description,
      fileMeta:
        resource.fileMeta && text.fileDetail
          ? { ...resource.fileMeta, detail: text.fileDetail }
          : resource.fileMeta,
      image:
        resource.image && text.imageAlt
          ? { ...resource.image, alt: text.imageAlt }
          : resource.image,
      body:
        body.kind === 'markdown'
          ? { ...body, markdown: text.markdown ?? body.markdown }
          : body.kind === 'table'
            ? {
                ...body,
                columns: text.columns ?? body.columns,
                rows: text.rows ?? body.rows,
                note: text.note ?? body.note,
              }
            : body,
    };
  });
}

export function localizeDepartment(
  department: DepartmentDefinition,
  translations: Translations<Record<string, DepartmentText>> | undefined,
  locale: Locale,
): DepartmentDefinition {
  const text = locale === 'en' ? undefined : translations?.[locale]?.[department.slug];
  if (!text) return department;
  return {
    ...department,
    name: text.name ?? department.name,
    tagline: text.tagline ?? department.tagline,
    description: text.description ?? department.description,
    projectTitle: text.projectTitle ?? department.projectTitle,
    coreQuestion: text.coreQuestion ?? department.coreQuestion,
    finalOutput: text.finalOutput ?? department.finalOutput,
  };
}
