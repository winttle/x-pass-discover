import type { AnswerValue } from '@/types/runtime';

/**
 * Declarative prefill for task fields.
 *
 * Supports `{{taskKey.fieldKey}}` and `{{taskKey.groupKey[].subKey}}` (which
 * renders one bullet per row). Keeps "carry prior work forward" in scenario
 * content instead of a bespoke composer per scenario.
 *
 * An unresolved reference renders as an empty string rather than leaking the
 * raw token into the student's draft.
 */

const TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;

function readPath(
  answersByTask: Record<string, AnswerValue>,
  expression: string,
): string {
  const listMatch = expression.match(/^([^.]+)\.([^.[\]]+)\[\]\.(.+)$/);
  if (listMatch) {
    const [, taskKey, groupKey, subKey] = listMatch;
    const rows = answersByTask[taskKey]?.[groupKey];
    if (!Array.isArray(rows)) return '';
    return rows
      .map((row) =>
        row && typeof row === 'object'
          ? String((row as Record<string, unknown>)[subKey] ?? '').trim()
          : '',
      )
      .filter(Boolean)
      .map((line) => `- ${line}`)
      .join('\n');
  }

  const [taskKey, ...rest] = expression.split('.');
  if (!taskKey || rest.length === 0) return '';
  let current: unknown = answersByTask[taskKey];
  for (const segment of rest) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return '';
    }
    current = (current as Record<string, unknown>)[segment];
  }
  if (current === null || current === undefined) return '';
  if (typeof current === 'object') return '';
  return String(current);
}

export function resolvePrefillTemplate(
  template: string,
  answersByTask: Record<string, AnswerValue>,
): string {
  return template.replace(TOKEN, (_match, expression: string) =>
    readPath(answersByTask, expression),
  );
}

/** True when the resolved template produced no real content. */
export function isEmptyPrefill(resolved: string): boolean {
  return resolved.replace(/[\s\-:¥,]/g, '').length === 0;
}
