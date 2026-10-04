'use client';

import { Badge, Card, CardHeader } from '@/components/ui';
import type { AnswerValue } from '@/types/runtime';
import type { StepView, TaskView } from '@/types/session-view';

/**
 * Read-only view of earlier work shown beside the current task.
 *
 * This is how revision stays honest: Proposal v1 is never overwritten, it sits
 * next to the revision form so the student (and later, evaluation) can see what
 * actually changed.
 */
export function ReferenceAnswers({
  steps,
  taskKeys,
}: {
  steps: StepView[];
  taskKeys: string[];
}) {
  if (taskKeys.length === 0) return null;

  const tasks = taskKeys
    .map((key) => {
      for (const step of steps) {
        const task = step.tasks.find((t) => t.key === key);
        if (task) return { step, task };
      }
      return null;
    })
    .filter((entry): entry is { step: StepView; task: TaskView } => entry !== null)
    .filter(({ task }) => Object.keys(task.value ?? {}).length > 0);

  if (tasks.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Your earlier work"
        subtitle="Preserved, not overwritten"
      />
      <div className="divide-y divide-line">
        {tasks.map(({ step, task }) => (
          <details key={task.key} className="group">
            <summary className="flex cursor-pointer items-center justify-between gap-2 px-5 py-3 text-xs hover:bg-sunken">
              <span className="min-w-0">
                <span className="block font-medium text-strong">{task.title}</span>
                <span className="text-[11px] text-muted">{step.title}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {task.version > 1 ? <Badge tone="warn">v{task.version}</Badge> : null}
                <span className="text-muted group-open:hidden">+</span>
                <span className="hidden text-muted group-open:inline">−</span>
              </span>
            </summary>
            <div className="border-t border-line bg-sunken px-5 py-3">
              <AnswerPreview task={task} />
            </div>
          </details>
        ))}
      </div>
    </Card>
  );
}

function AnswerPreview({ task }: { task: TaskView }) {
  const value = task.value ?? {};
  const labelByKey = new Map(task.fields.map((f) => [f.key, f.label] as const));

  const entries = Object.entries(value).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  );
  if (entries.length === 0) {
    return <p className="text-[11px] text-muted">Nothing recorded yet.</p>;
  }

  return (
    <dl className="space-y-2">
      {entries.map(([key, raw]) => (
        <div key={key}>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {labelByKey.get(key) ?? key}
          </dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-body">
            {formatValue(raw)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function formatValue(raw: unknown): string {
  if (Array.isArray(raw)) {
    return raw
      .map((row, index) => {
        if (row && typeof row === 'object') {
          const parts = Object.entries(row as AnswerValue)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => `${k}: ${String(v)}`);
          return `${index + 1}. ${parts.join(' · ')}`;
        }
        return `${index + 1}. ${String(row)}`;
      })
      .join('\n');
  }
  return String(raw);
}
