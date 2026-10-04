'use client';

import { Badge, Button } from '@/components/ui';
import type { TaskField } from '@/types/scenario';
import { FieldInput } from './field-input';

type Row = Record<string, unknown>;

/**
 * Repeatable rows (3 strengths, 5 buyer questions, HR scorecard rows later).
 * Rows below `minRows` cannot be removed, so a task's completion rule and its
 * editor never disagree about how many rows exist.
 */
export function RepeatableGroup({
  field,
  value,
  onChange,
  disabled,
}: {
  field: TaskField;
  value: unknown;
  onChange: (next: Row[]) => void;
  disabled?: boolean;
}) {
  const minRows = field.minRows ?? 1;
  const maxRows = field.maxRows ?? 20;
  const rows: Row[] = Array.isArray(value) ? (value as Row[]) : [];
  const padded =
    rows.length >= (field.initialRows ?? minRows)
      ? rows
      : [
          ...rows,
          ...Array.from(
            { length: (field.initialRows ?? minRows) - rows.length },
            (): Row => ({}),
          ),
        ];

  const update = (index: number, key: string, next: unknown) => {
    const copy = padded.map((row, i) => (i === index ? { ...row, [key]: next } : row));
    onChange(copy);
  };

  const subFields = field.fields ?? [];

  return (
    <div className="space-y-3">
      {padded.map((row, index) => (
        <div
          key={index}
          className="rounded-xl border border-ink-800 bg-ink-950/40 p-3.5"
        >
          <div className="mb-3 flex items-center justify-between">
            <Badge tone="muted">#{index + 1}</Badge>
            {padded.length > minRows ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(padded.filter((_, i) => i !== index))}
                className="text-[11px] text-ink-500 transition-colors hover:text-danger-400 disabled:opacity-40"
              >
                Remove
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            {subFields.map((sub) => (
              <label key={sub.key} className="block">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-ink-300">
                    {sub.label}
                    {sub.required ? <span className="ml-1 text-danger-400">*</span> : null}
                  </span>
                  {sub.epistemicKind === 'fact' ? (
                    <Badge tone="success">Evidence</Badge>
                  ) : null}
                  {sub.epistemicKind === 'hypothesis' ? (
                    <Badge tone="warn">Hypothesis</Badge>
                  ) : null}
                </div>
                <FieldInput
                  field={sub}
                  value={row[sub.key]}
                  onChange={(next) => update(index, sub.key, next)}
                  disabled={disabled}
                />
                {sub.helpText ? (
                  <p className="mt-1 text-[10px] text-ink-500">{sub.helpText}</p>
                ) : null}
              </label>
            ))}
          </div>
        </div>
      ))}

      {padded.length < maxRows ? (
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => onChange([...padded, {}])}
          className="w-full"
        >
          + Add another
        </Button>
      ) : null}
    </div>
  );
}
