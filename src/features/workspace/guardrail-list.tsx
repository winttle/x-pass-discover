'use client';

import { Badge } from '@/components/ui';
import type { GuardrailWarning } from '@/services/scenario/guardrails';

/** Guardrails warn. They never correct the answer and never block a submit. */
export function GuardrailList({ warnings }: { warnings: GuardrailWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {warnings.map((warning) => {
        const isViolation = warning.severity === 'violation';
        return (
          <div
            key={warning.key}
            className={`rounded-xl border px-3.5 py-3 ${
              isViolation
                ? 'border-danger-400/40 bg-danger-400/10'
                : 'border-warn-400/40 bg-warn-400/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Badge tone={isViolation ? 'danger' : 'warn'}>
                {isViolation ? 'Outside BITE guardrail' : 'QuickMart criteria'}
              </Badge>
              <span className="text-xs font-semibold text-strong">{warning.title}</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-body">
              {warning.message}
            </p>
          </div>
        );
      })}
    </div>
  );
}
