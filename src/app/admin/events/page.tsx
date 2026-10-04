import { redirect } from 'next/navigation';
import { Badge, Card, CardHeader, EmptyState } from '@/components/ui';
import { getRepository } from '@/db/repository';
import { getCurrentUser } from '@/lib/auth/session';
import Link from 'next/link';

/**
 * Behavior event inspector.
 *
 * Exists so event ORDER can be verified during testing. Deliberately shows raw
 * rows and no aggregate scores — these events are contextual evidence, and
 * turning counts into points is exactly what the product rules forbid.
 */
export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { session: sessionId } = await searchParams;
  const repo = getRepository();
  const sessions = await repo.listSessionsForUser(user.id);
  const selected = sessions.find((s) => s.id === sessionId) ?? sessions[0] ?? null;
  const events = selected
    ? await repo.listEvents({ sessionId: selected.id, limit: 500 })
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Behavior events"
          subtitle="Raw, ordered event log for the selected session"
        />
        <div className="flex flex-wrap gap-2 px-5 py-3">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted">No sessions yet.</p>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/admin/events?session=${session.id}`}
                className={`rounded-lg border px-3 py-1.5 text-[11px] transition-colors ${
                  selected?.id === session.id
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-line text-muted hover:border-line-strong hover:text-strong'
                }`}
              >
                {session.departmentSlug} · {session.id.slice(0, 8)}
              </Link>
            ))
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={`${events.length} events`}
          subtitle={selected ? `Session ${selected.id}` : 'No session selected'}
          right={<Badge tone="muted">oldest first</Badge>}
        />
        {events.length === 0 ? (
          <div className="p-5">
            <EmptyState>
              Nothing logged yet. Start a bootcamp, open a resource, or talk to an NPC.
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  {['#', 'Time', 'Event', 'Step', 'Task', 'Metadata'].map((h) => (
                    <th
                      key={h}
                      className="border-b border-line px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => (
                  <tr key={event.id}>
                    <td className="border-b border-line px-3 py-1.5 font-mono text-subtle">
                      {index + 1}
                    </td>
                    <td className="border-b border-line px-3 py-1.5 font-mono text-muted">
                      {new Date(event.occurredAt).toLocaleTimeString()}
                    </td>
                    <td className="border-b border-line px-3 py-1.5">
                      <span className="font-mono text-brand-400">{event.eventType}</span>
                    </td>
                    <td className="border-b border-line px-3 py-1.5 font-mono text-muted">
                      {event.stepKey ?? '—'}
                    </td>
                    <td className="border-b border-line px-3 py-1.5 font-mono text-muted">
                      {event.taskKey ?? '—'}
                    </td>
                    <td className="border-b border-line px-3 py-1.5 font-mono text-muted">
                      {Object.keys(event.metadata).length > 0
                        ? JSON.stringify(event.metadata)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-line px-5 py-3 text-[11px] text-muted">
          These are evidence, not points. Counts and durations here must never be converted
          directly into a SKILL FIT score.
        </p>
      </Card>
    </div>
  );
}
