'use client';

import { useState } from 'react';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { ChatPanel } from '@/features/ai/chat-panel';
import { saveTask } from '@/lib/client-api';
import type { PublicPersona } from '@/types/ai';
import type { ResourceDefinition } from '@/types/resource';
import type { SessionView, StepView, TaskView } from '@/types/session-view';
import { DynamicForm } from './dynamic-form';
import { ReferenceAnswers } from './reference-answers';

const STATUS_TONE = {
  not_started: 'muted',
  draft: 'warn',
  complete: 'success',
} as const;

const STATUS_LABEL = {
  not_started: 'Not started',
  draft: 'In progress',
  complete: 'Complete',
} as const;

export function TaskCard({
  sessionId,
  step,
  task,
  steps,
  resources,
  personas,
  onSessionUpdate,
}: {
  sessionId: string;
  step: StepView;
  task: TaskView;
  steps: StepView[];
  resources: ResourceDefinition[];
  personas: PublicPersona[];
  onSessionUpdate: (view: SessionView) => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={task.title}
          subtitle={task.instructions ?? undefined}
          right={
            <div className="flex items-center gap-1.5">
              {!task.required ? <Badge tone="muted">Optional</Badge> : null}
              <Badge tone={STATUS_TONE[task.status]}>{STATUS_LABEL[task.status]}</Badge>
            </div>
          }
        />
        <div className="px-5 py-5">
          <TaskBody
            sessionId={sessionId}
            step={step}
            task={task}
            resources={resources}
            personas={personas}
            onSessionUpdate={onSessionUpdate}
          />
        </div>
      </Card>

      <ReferenceAnswers steps={steps} taskKeys={task.referenceTaskKeys} />
    </div>
  );
}

function TaskBody({
  sessionId,
  step,
  task,
  resources,
  personas,
  onSessionUpdate,
}: {
  sessionId: string;
  step: StepView;
  task: TaskView;
  resources: ResourceDefinition[];
  personas: PublicPersona[];
  onSessionUpdate: (view: SessionView) => void;
}) {
  if (task.kind === 'ai_conversation') {
    const persona = personas.find((p) => p.key === task.personaKey);
    if (!persona) {
      return (
        <p className="text-xs text-danger-400">
          Persona “{task.personaKey}” is not registered for this scenario.
        </p>
      );
    }
    return (
      <ChatPanel
        sessionId={sessionId}
        stepKey={step.key}
        persona={persona}
        minStudentMessages={task.conversation?.minStudentMessages ?? 0}
        onSessionUpdate={onSessionUpdate}
      />
    );
  }

  if (task.kind === 'acknowledge') {
    return (
      <AcknowledgeTask
        sessionId={sessionId}
        task={task}
        onSessionUpdate={onSessionUpdate}
      />
    );
  }

  return (
    <DynamicForm
      sessionId={sessionId}
      stepKey={step.key}
      task={task}
      resources={resources}
      onSessionUpdate={onSessionUpdate}
      submitLabel={task.kind === 'final_submission' ? 'Submit final proposal' : 'Submit'}
    />
  );
}

function AcknowledgeTask({
  sessionId,
  task,
  onSessionUpdate,
}: {
  sessionId: string;
  task: TaskView;
  onSessionUpdate: (view: SessionView) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = task.value?.acknowledged === true;

  async function acknowledge() {
    setPending(true);
    setError(null);
    try {
      const result = await saveTask(
        sessionId,
        task.key,
        { acknowledged: true },
        'submitted',
      );
      onSessionUpdate(result.view);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted">
        {done
          ? 'Marked complete. You can still re-read the material at any time.'
          : 'Mark this complete when you have read the material above.'}
      </p>
      {error ? <p className="text-xs text-danger-400">{error}</p> : null}
      <Button onClick={acknowledge} disabled={pending || done}>
        {done ? '✓ Completed' : pending ? 'Saving…' : 'Mark complete'}
      </Button>
    </div>
  );
}
