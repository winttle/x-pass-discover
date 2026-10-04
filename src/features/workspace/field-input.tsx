'use client';

import { Badge, Field, inputClass } from '@/components/ui';
import type { TaskField } from '@/types/scenario';
import type { ResourceDefinition } from '@/types/resource';

export type EvidenceOption = { value: string; label: string; group: string };

export function FieldInput({
  field,
  value,
  onChange,
  disabled,
  placeholderFromPrefill,
  evidenceOptions,
}: {
  field: TaskField;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled?: boolean;
  placeholderFromPrefill?: string;
  evidenceOptions?: EvidenceOption[];
}) {
  const common = { disabled, className: inputClass };

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          {...common}
          rows={4}
          value={String(value ?? '')}
          placeholder={placeholderFromPrefill || field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'number':
      return (
        <input
          {...common}
          type="number"
          inputMode="numeric"
          value={value === null || value === undefined ? '' : String(value)}
          min={field.validation?.min}
          max={field.validation?.max}
          placeholder={placeholderFromPrefill || field.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );

    case 'select':
      return (
        <select
          {...common}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— select —</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'multi_select': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {(field.options ?? []).map((option) => {
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange(
                    active
                      ? selected.filter((v) => v !== option.value)
                      : [...selected, option.value],
                  )
                }
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                  active
                    ? 'border-brand-500 bg-brand-500/20 text-white'
                    : 'border-ink-700 text-ink-400 hover:border-ink-500 hover:text-ink-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    case 'resource_evidence': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const options = evidenceOptions ?? [];
      if (options.length === 0) {
        return (
          <p className="rounded-lg border border-dashed border-ink-700 px-3 py-3 text-xs text-ink-500">
            Nothing to link yet — open resources and talk to people first.
          </p>
        );
      }
      const groups = Array.from(new Set(options.map((o) => o.group)));
      return (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                {group}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {options
                  .filter((o) => o.group === group)
                  .map((option) => {
                    const active = selected.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          onChange(
                            active
                              ? selected.filter((v) => v !== option.value)
                              : [...selected, option.value],
                          )
                        }
                        className={`max-w-full truncate rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
                          active
                            ? 'border-accent-400 bg-accent-400/15 text-white'
                            : 'border-ink-700 text-ink-400 hover:border-ink-500 hover:text-ink-200'
                        }`}
                        title={option.label}
                      >
                        {option.label}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    case 'text':
    default:
      return (
        <input
          {...common}
          type="text"
          value={String(value ?? '')}
          placeholder={placeholderFromPrefill || field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function PrefillHint({
  prefill,
  onApply,
  disabled,
}: {
  prefill: string;
  onApply: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-1.5 flex items-start gap-2 rounded-lg border border-ink-800 bg-ink-950/50 px-2.5 py-2">
      <Badge tone="muted">From your earlier work</Badge>
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-[11px] leading-relaxed text-ink-400">
        {prefill}
      </p>
      <button
        type="button"
        onClick={onApply}
        disabled={disabled}
        className="shrink-0 rounded-md border border-ink-600 px-2 py-1 text-[10px] text-ink-300 transition-colors hover:border-brand-500 hover:text-white disabled:opacity-40"
      >
        Use
      </button>
    </div>
  );
}

export function resourcesToEvidenceOptions(
  resources: ResourceDefinition[],
): EvidenceOption[] {
  return resources.map((resource) => ({
    value: `resource:${resource.key}`,
    label: resource.title,
    group: 'Data Room',
  }));
}

export { Field };
