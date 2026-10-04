'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Field } from '@/components/ui';
import { logClientEvent, saveTask } from '@/lib/client-api';
import { evaluateGuardrails, type GuardrailWarning } from '@/services/scenario/guardrails';
import type { AnswerValue } from '@/types/runtime';
import type { ResourceDefinition } from '@/types/resource';
import type { TaskField } from '@/types/scenario';
import type { SessionView, TaskView } from '@/types/session-view';
import { DealEconomicsPanel } from './deal-economics-panel';
import { FieldInput, PrefillHint } from './field-input';
import { GuardrailList } from './guardrail-list';
import { RepeatableGroup } from './repeatable-group';
import { useEvidenceOptions } from './use-evidence-options';

const AUTOSAVE_DELAY_MS = 1200;

/**
 * Renders a task from its field definitions.
 *
 * One component drives every structured task in every department — adding a
 * scenario means adding field definitions, not another React form.
 */
export function DynamicForm({
  sessionId,
  stepKey,
  task,
  resources,
  onSessionUpdate,
  submitLabel = 'Submit',
}: {
  sessionId: string;
  stepKey: string;
  task: TaskView;
  resources: ResourceDefinition[];
  onSessionUpdate: (view: SessionView) => void;
  submitLabel?: string;
}) {
  const [value, setValue] = useState<AnswerValue>(task.value ?? {});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [serverWarnings, setServerWarnings] = useState<GuardrailWarning[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const startedRef = useRef(task.status !== 'not_started');

  const evidenceOptions = useEvidenceOptions(sessionId, task.fields, resources);

  // Re-sync when the server view changes this task underneath us (e.g. after a
  // submit elsewhere), but never clobber in-flight local edits.
  useEffect(() => {
    if (!dirtyRef.current) setValue(task.value ?? {});
  }, [task.value]);

  const persist = useCallback(
    async (next: AnswerValue, status: 'draft' | 'submitted') => {
      const result = await saveTask(sessionId, task.key, next, status);
      setServerWarnings(result.warnings);
      onSessionUpdate(result.view);
      return result;
    },
    [sessionId, task.key, onSessionUpdate],
  );

  const scheduleAutosave = useCallback(
    (next: AnswerValue) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setSaveState('saving');
      timerRef.current = setTimeout(async () => {
        try {
          await persist(next, 'draft');
          dirtyRef.current = false;
          setSaveState('saved');
        } catch (cause) {
          setSaveState('error');
          setError(cause instanceof Error ? cause.message : 'Autosave failed');
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [persist],
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function update(key: string, next: unknown) {
    // First real edit of this task — logged once, as evidence of when work
    // began, never as a score.
    if (!startedRef.current) {
      startedRef.current = true;
      void logClientEvent(sessionId, {
        eventType: 'task_started',
        stepKey,
        taskKey: task.key,
      });
    }
    dirtyRef.current = true;
    setValue((prev) => {
      const merged = { ...prev, [key]: next };
      scheduleAutosave(merged);
      return merged;
    });
  }

  async function submit() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSubmitting(true);
    setError(null);
    try {
      await persist(value, 'submitted');
      dirtyRef.current = false;
      setSaveState('saved');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  }

  // Live warnings while typing; the server recomputes them authoritatively.
  const liveWarnings = useMemo(
    () => evaluateGuardrails(task.guardrailKeys, value),
    [task.guardrailKeys, value],
  );
  const warnings = liveWarnings.length > 0 ? liveWarnings : serverWarnings;

  const showEconomics = task.fields.some((f) => f.calculatorKey === 'deal-economics');
  const missing = missingRequired(task.fields, value);

  return (
    <div className="space-y-5">
      {showEconomics ? <DealEconomicsPanel value={value} /> : null}

      <div className="space-y-5">
        {task.fields.map((field) => {
          const prefill = task.prefill[field.key];
          const isEmpty = isBlank(value[field.key]);

          if (field.type === 'repeatable_group') {
            return (
              <div key={field.key}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink-200">
                    {field.label}
                    {field.required ? <span className="ml-1 text-danger-400">*</span> : null}
                  </span>
                  {field.minRows ? (
                    <Badge tone="muted">min {field.minRows}</Badge>
                  ) : null}
                </div>
                {field.helpText ? (
                  <p className="mb-2 text-[11px] text-ink-400">{field.helpText}</p>
                ) : null}
                <RepeatableGroup
                  field={field}
                  value={value[field.key]}
                  onChange={(next) => update(field.key, next)}
                />
              </div>
            );
          }

          return (
            <div key={field.key}>
              <Field
                label={field.label}
                helpText={field.helpText}
                required={field.required}
                epistemic={field.epistemicKind}
              >
                <FieldInput
                  field={field}
                  value={value[field.key]}
                  onChange={(next) => update(field.key, next)}
                  evidenceOptions={evidenceOptions}
                />
              </Field>
              {prefill && isEmpty && prefill.trim().length > 0 ? (
                <PrefillHint
                  prefill={prefill}
                  onApply={() => update(field.key, coerce(field, prefill))}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <GuardrailList warnings={warnings} />

      {error ? (
        <p className="rounded-lg border border-danger-400/30 bg-danger-400/10 px-3 py-2 text-xs text-danger-400">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-800 pt-4">
        <p className="text-[11px] text-ink-500">
          {saveState === 'saving'
            ? 'Saving…'
            : saveState === 'saved'
              ? `Draft saved · v${task.version}`
              : saveState === 'error'
                ? 'Autosave failed'
                : task.updatedAt
                  ? `Last saved ${new Date(task.updatedAt).toLocaleTimeString()}`
                  : 'Not saved yet'}
          {missing.length > 0 ? (
            <span className="ml-2 text-warn-400">
              {missing.length} required field{missing.length === 1 ? '' : 's'} left
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          {task.status === 'complete' ? <Badge tone="success">Complete</Badge> : null}
          <Button onClick={submit} disabled={submitting}>
            {submitting
              ? 'Submitting…'
              : task.submittedAt
                ? `Resubmit ${submitLabel.toLowerCase()}`
                : submitLabel}
          </Button>
        </div>
      </div>

      {warnings.some((w) => w.severity === 'violation') ? (
        <p className="text-[11px] leading-relaxed text-ink-500">
          You can still submit this. BITE will flag it, and the choice is recorded —
          guardrail warnings do not silently correct your answer.
        </p>
      ) : null}
    </div>
  );
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function coerce(field: TaskField, raw: string): unknown {
  if (field.type !== 'number') return raw;
  const n = Number(raw.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function missingRequired(fields: TaskField[], value: AnswerValue): string[] {
  return fields
    .filter((field) => {
      if (!field.required) return false;
      if (field.type === 'repeatable_group') {
        const rows = Array.isArray(value[field.key]) ? (value[field.key] as unknown[]) : [];
        const requiredSubKeys = (field.fields ?? []).filter((f) => f.required).map((f) => f.key);
        const complete = rows.filter(
          (row) =>
            row &&
            typeof row === 'object' &&
            requiredSubKeys.every((k) => !isBlank((row as Record<string, unknown>)[k])),
        ).length;
        return complete < (field.minRows ?? 1);
      }
      return isBlank(value[field.key]);
    })
    .map((f) => f.key);
}
