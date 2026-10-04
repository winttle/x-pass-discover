import type { ResourceDefinition } from '@/types/resource';
import type { ScenarioVersionDefinition } from '@/types/scenario';
import { SALES_SCENARIO } from './sales/scenario';
import { SALES_RESOURCES } from './sales/resources';

/**
 * Public scenario content registry (client-safe).
 *
 * Hidden persona data is NOT here — see `personas.server.ts`.
 *
 * Content is addressed by `scenarioKey` + `version`, which maps 1:1 onto a
 * `scenario_versions` row. A session pins that pair at creation, so publishing
 * a new version never mutates a session that is already running.
 */

const SCENARIOS: ScenarioVersionDefinition[] = [SALES_SCENARIO];

const RESOURCES_BY_SCENARIO: Record<string, ResourceDefinition[]> = {
  'sales-quickmart': SALES_RESOURCES,
};

export function listScenarios(): ScenarioVersionDefinition[] {
  return SCENARIOS;
}

export function getScenarioVersion(
  scenarioKey: string,
  version: number,
): ScenarioVersionDefinition | null {
  return (
    SCENARIOS.find((s) => s.scenarioKey === scenarioKey && s.version === version) ??
    null
  );
}

/** The version new sessions should start on. */
export function getPublishedScenario(
  scenarioKey: string,
): ScenarioVersionDefinition | null {
  const published = SCENARIOS.filter(
    (s) => s.scenarioKey === scenarioKey && s.status === 'published',
  );
  if (published.length === 0) return null;
  return published.reduce((a, b) => (b.version > a.version ? b : a));
}

export function listResources(scenarioKey: string): ResourceDefinition[] {
  return [...(RESOURCES_BY_SCENARIO[scenarioKey] ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function getResource(
  scenarioKey: string,
  resourceKey: string,
): ResourceDefinition | null {
  return listResources(scenarioKey).find((r) => r.key === resourceKey) ?? null;
}

/** Flattened step lookup helpers. */
export function getStep(scenario: ScenarioVersionDefinition, stepKey: string) {
  return scenario.steps.find((s) => s.key === stepKey) ?? null;
}

export function findTask(scenario: ScenarioVersionDefinition, taskKey: string) {
  for (const step of scenario.steps) {
    const task = step.tasks.find((t) => t.key === taskKey);
    if (task) return { step, task };
  }
  return null;
}
