import { Badge, Card, CardHeader } from '@/components/ui';
import { listScenarios } from '@/content/registry';

export default function AdminScenariosPage() {
  const scenarios = listScenarios();

  return (
    <div className="space-y-5">
      {scenarios.map((scenario) => (
        <Card key={`${scenario.scenarioKey}-${scenario.version}`}>
          <CardHeader
            title={scenario.title}
            subtitle={`${scenario.scenarioKey} · ${scenario.finalOutputTitle} · deadline ${scenario.deadlineHours}h`}
            right={
              <div className="flex gap-1.5">
                <Badge tone="brand">v{scenario.version}</Badge>
                <Badge tone={scenario.status === 'published' ? 'success' : 'muted'}>
                  {scenario.status}
                </Badge>
              </div>
            }
          />
          <ol className="divide-y divide-ink-800">
            {[...scenario.steps]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((step) => (
                <li key={step.key} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-ink-500">
                      {step.sortOrder}
                    </span>
                    <span className="text-xs font-semibold text-white">{step.title}</span>
                    <Badge tone="muted">{step.stepType}</Badge>
                    {step.estimatedMinutes ? (
                      <span className="text-[10px] text-ink-500">
                        {step.estimatedMinutes} min
                      </span>
                    ) : null}
                    {step.officeZoneKey ? (
                      <span className="text-[10px] text-ink-500">
                        · zone: {step.officeZoneKey}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1.5 font-mono text-[10px] text-ink-500">
                    key: {step.key} · unlock: {JSON.stringify(step.unlockRule)}
                  </p>

                  <ul className="mt-2 space-y-1">
                    {step.tasks.map((task) => (
                      <li
                        key={task.key}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-ink-950/50 px-3 py-1.5"
                      >
                        <Badge tone="muted">{task.kind}</Badge>
                        <span className="text-[11px] text-ink-200">{task.title}</span>
                        {task.required === false ? (
                          <Badge tone="muted">optional</Badge>
                        ) : null}
                        {task.personaKey ? (
                          <span className="font-mono text-[10px] text-brand-400">
                            persona: {task.personaKey}
                          </span>
                        ) : null}
                        <span className="font-mono text-[10px] text-ink-500">
                          {(task.fields ?? []).length} fields · completion:{' '}
                          {task.completion.type}
                        </span>
                        {task.guardrailKeys?.length ? (
                          <span className="font-mono text-[10px] text-warn-400">
                            guardrails: {task.guardrailKeys.length}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ol>
        </Card>
      ))}
    </div>
  );
}
