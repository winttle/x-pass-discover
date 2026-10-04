import { Badge, Card, CardHeader } from '@/components/ui';
import { DEPARTMENTS } from '@/content/departments';
import { listResources, listScenarios } from '@/content/registry';
import { listPersonas } from '@/content/personas.server';
import { runtimeModeSummary } from '@/lib/env';

export default function AdminOverviewPage() {
  const runtime = runtimeModeSummary();
  const scenarios = listScenarios();

  const stats = [
    ['Departments', DEPARTMENTS.length],
    ['Playable', DEPARTMENTS.filter((d) => d.status === 'playable').length],
    ['Scenario versions', scenarios.length],
    [
      'Steps',
      scenarios.reduce((total, scenario) => total + scenario.steps.length, 0),
    ],
    [
      'Tasks',
      scenarios.reduce(
        (total, scenario) =>
          total + scenario.steps.reduce((sum, step) => sum + step.tasks.length, 0),
        0,
      ),
    ],
    [
      'Resources',
      scenarios.reduce(
        (total, scenario) => total + listResources(scenario.scenarioKey).length,
        0,
      ),
    ],
    [
      'Personas',
      scenarios.reduce(
        (total, scenario) => total + listPersonas(scenario.scenarioKey).length,
        0,
      ),
    ],
  ] as const;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Runtime"
          subtitle="Which adapters are actually live right now"
        />
        <div className="flex flex-wrap gap-2 px-5 py-4">
          <Badge tone="muted">Persistence: {runtime.persistenceLabel}</Badge>
          <Badge tone={runtime.aiModeDowngraded ? 'warn' : 'muted'}>
            AI: {runtime.aiLabel}
          </Badge>
        </div>
      </Card>

      <Card>
        <CardHeader title="Content" subtitle="Loaded from the scenario registry" />
        <dl className="grid grid-cols-2 gap-px bg-ink-800 sm:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-ink-900 px-4 py-3">
              <dt className="text-[10px] uppercase tracking-wider text-ink-500">
                {label}
              </dt>
              <dd className="mt-1 font-mono text-lg text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <CardHeader title="Note on this admin" />
        <p className="px-5 py-4 text-xs leading-relaxed text-ink-400">
          This is an inspection surface, not an authoring CMS. Scenario content is defined
          in <code className="text-accent-400">src/content/</code> and seeded into Neon so
          that the database carries the same definitions. Hidden persona fact content is
          deliberately not rendered anywhere in the app, including here — see AI Personas.
        </p>
      </Card>
    </div>
  );
}
