'use client';

import { useState } from 'react';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { ChatPanel } from '@/features/ai/chat-panel';
import { useT } from '@/i18n/client';
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
  const t = useT();
  return (
    <div
      className="space-y-4"
      data-task-key={task.key}
      data-task-kind={task.kind}
      data-task-status={task.status}
      data-task-required={task.required ? 'true' : 'false'}
    >
      <Card>
        <CardHeader
          title={task.title}
          subtitle={task.instructions ?? undefined}
          right={
            <div className="flex items-center gap-1.5">
              {!task.required ? <Badge tone="muted">{t('task.optional')}</Badge> : null}
              <Badge tone={STATUS_TONE[task.status]}>{t(`task.status.${task.status}`)}</Badge>
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
  const t = useT();
  if (task.kind === 'ai_conversation') {
    const persona = personas.find((p) => p.key === task.personaKey);
    if (!persona) {
      return (
        <p className="text-xs text-danger-400">
          {t('task.personaMissing', { key: task.personaKey ?? '' })}
        </p>
      );
    }
    return (
      <ChatPanel
        sessionId={sessionId}
        stepKey={step.key}
        persona={persona}
        minStudentMessages={task.minStudentMessages}
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
      submitLabel={
        task.kind === 'final_submission' ? t('task.submitFinal') : t('task.submit')
      }
      resubmitLabel={
        task.kind === 'final_submission' ? t('task.resubmitFinal') : t('task.resubmit')
      }
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
  const t = useT();
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
      setError(cause instanceof Error ? cause.message : t('task.saveFailed'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted">
        {done ? t('ack.done') : t('ack.todo')}
      </p>
      {error ? <p className="text-xs text-danger-400">{error}</p> : null}
      <Button
        onClick={acknowledge}
        disabled={pending || done}
        data-testid="acknowledge"
      >
        {done ? t('ack.completed') : pending ? t('ack.saving') : t('ack.mark')}
      </Button>
    </div>
  );
}
