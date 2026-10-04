import { Badge, Card, CardHeader } from '@/components/ui';
import { listScenarios } from '@/content/registry';
import { listPersonas } from '@/content/personas.server';

/**
 * Persona inspection.
 *
 * INVARIANT: no page in this application ever serialises hidden fact content or
 * a persona system prompt to a browser — not the student UI, and not here. This
 * page shows the wiring (ids, labels, visibility, disclosure rules, trigger
 * topics) so disclosure behaviour can be inspected and debugged without the
 * payload leaving the server. Authoring the content belongs in a later admin
 * with real roles behind it.
 */
export default function AdminPersonasPage() {
  return (
    <div className="space-y-5">
      <Card className="border-warn-400/30 bg-warn-400/5">
        <p className="px-5 py-3.5 text-[11px] leading-relaxed text-body">
          Hidden fact <strong className="text-strong">content</strong> and persona{' '}
          <strong className="text-strong">system prompts</strong> are intentionally not
          rendered. They exist only in{' '}
          <code className="text-accent-400">src/content/**/personas.server.ts</code>, which
          is marked <code className="text-accent-400">server-only</code> — importing it from
          a client component is a build error.
        </p>
      </Card>

      {listScenarios().map((scenario) => (
        <div key={scenario.scenarioKey} className="space-y-4">
          {listPersonas(scenario.scenarioKey).map((persona) => (
            <Card key={persona.key}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: persona.avatarColor }}
                    />
                    {persona.name}
                  </span>
                }
                subtitle={`${persona.role} · ${persona.organization} · key: ${persona.key}`}
                right={
                  <div className="flex gap-1.5">
                    <Badge tone="muted">
                      {persona.facts.filter((f) => f.visibility === 'hidden').length} hidden
                    </Badge>
                    <Badge
                      tone={persona.contextPolicy.includeStudentWork ? 'warn' : 'success'}
                      title="Whether this persona may be shown the student's private drafts"
                    >
                      {persona.contextPolicy.includeStudentWork
                        ? 'sees student work'
                        : 'conversation only'}
                    </Badge>
                  </div>
                }
              />

              <div className="border-b border-line px-5 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted">
                  Visible context (client-safe)
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-body">
                  {persona.visibleContext}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-muted">
                  Reachable from steps
                </p>
                <p className="mt-1 font-mono text-[11px] text-body">
                  {persona.stepKeys.join(', ')}
                </p>
              </div>

              <ul className="divide-y divide-line">
                {persona.facts.map((fact) => (
                  <li key={fact.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={fact.visibility === 'hidden' ? 'danger' : 'success'}>
                        {fact.visibility}
                      </Badge>
                      <span className="font-mono text-[11px] text-strong">{fact.id}</span>
                      <span className="text-[11px] text-strong">{fact.label}</span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                      <span className="text-muted">Disclosure rule: </span>
                      {fact.disclosureRule}
                    </p>
                    <p className="mt-1 font-mono text-[10px] leading-relaxed text-subtle">
                      triggers: {fact.triggerTopics.join(' · ')}
                    </p>
                    {fact.visibility === 'hidden' ? (
                      <p className="mt-1.5 rounded bg-sunken px-2 py-1 text-[10px] text-subtle">
                        content withheld — server-only
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
