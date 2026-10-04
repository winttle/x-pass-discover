import { Badge, Card, CardHeader } from '@/components/ui';
import { listResources, listScenarios } from '@/content/registry';

export default function AdminResourcesPage() {
  return (
    <div className="space-y-5">
      {listScenarios().map((scenario) => {
        const resources = listResources(scenario.scenarioKey);
        return (
          <Card key={scenario.scenarioKey}>
            <CardHeader
              title={`${scenario.title} — resources`}
              subtitle={`${resources.length} resources in the Data Room`}
            />
            <ul className="divide-y divide-line">
              {resources.map((resource) => (
                <li key={resource.key} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="muted">{resource.resourceType}</Badge>
                    <span className="text-xs font-medium text-strong">
                      {resource.title}
                    </span>
                    <span className="font-mono text-[10px] text-muted">
                      {resource.key} · {resource.body.kind} · {resource.visibility}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{resource.description}</p>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
