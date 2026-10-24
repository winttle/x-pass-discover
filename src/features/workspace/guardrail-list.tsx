'use client';

import { Badge } from '@/components/ui';
import { useT } from '@/i18n/client';
import { isMessageKey } from '@/i18n/translate';
import type { GuardrailWarning } from '@/services/scenario/guardrails';

/** Guardrails warn. They never correct the answer and never block a submit. */
export function GuardrailList({ warnings }: { warnings: GuardrailWarning[] }) {
  const t = useT();
  if (warnings.length === 0) return null;

  // A check with no dictionary entry is shown in the English it was written in.
  const text = (warning: GuardrailWarning, part: 'title' | 'message') => {
    const key = `guardrail.${warning.key}.${part}`;
    return isMessageKey(key) ? t(key, warning.vars) : warning[part];
  };

  return (
    <div className="space-y-2">
      {warnings.map((warning) => {
        const isViolation = warning.severity === 'violation';
        return (
          <div
            key={warning.key}
            data-testid="guardrail"
            data-guardrail-key={warning.key}
            data-severity={warning.severity}
            className={`rounded-xl border px-3.5 py-3 ${
              isViolation
                ? 'border-danger-400/40 bg-danger-400/10'
                : 'border-warn-400/40 bg-warn-400/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Badge tone={isViolation ? 'danger' : 'warn'}>
                {isViolation ? t('guardrail.violation') : t('guardrail.advisory')}
              </Badge>
              <span className="text-xs font-semibold text-strong">{text(warning, 'title')}</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-body">
              {text(warning, 'message')}
            </p>
          </div>
        );
      })}
    </div>
  );
}
