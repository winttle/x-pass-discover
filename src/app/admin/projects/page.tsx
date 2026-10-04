import { Card, CardHeader } from '@/components/ui';
import { DEPARTMENTS } from '@/content/departments';
import { getPublishedScenario } from '@/content/registry';

export default function AdminProjectsPage() {
  return (
    <div className="space-y-4">
      {DEPARTMENTS.map((department) => {
        const scenario = department.scenarioKey
          ? getPublishedScenario(department.scenarioKey)
          : null;
        return (
          <Card key={department.projectKey}>
            <CardHeader
              title={department.projectTitle}
              subtitle={`${department.name} · ${department.projectKey}`}
            />
            <dl className="grid gap-px bg-sunken sm:grid-cols-2">
              {[
                ['Core question', department.coreQuestion],
                ['Final output', department.finalOutput],
                ['Product', department.productKey ?? 'null (by design)'],
                ['Student role', scenario?.studentRole ?? 'not authored'],
                ['Mission', scenario?.mission ?? 'not authored'],
                [
                  'Published version',
                  scenario ? `v${scenario.version} (${scenario.status})` : '—',
                ],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface px-4 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-muted">
                    {label}
                  </dt>
                  <dd className="mt-0.5 text-xs text-strong">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        );
      })}
    </div>
  );
}
