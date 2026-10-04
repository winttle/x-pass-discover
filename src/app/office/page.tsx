import { redirect } from 'next/navigation';
import { AppShell, RuntimeBadges } from '@/components/app-shell';
import { getRepository } from '@/db/repository';
import { getCurrentUser } from '@/lib/auth/session';
import { runtimeModeSummary } from '@/lib/env';
import { loadSessionView } from '@/services/scenario/session-service';
import { OfficeClient } from '@/features/office/office-client';
import type { SessionView } from '@/types/session-view';

export default async function OfficePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { session: requestedSessionId } = await searchParams;
  const repo = getRepository();

  // Fall back to the student's most recent session so walking into the office
  // from anywhere still lands them in their own bootcamp.
  const sessions = await repo.listSessionsForUser(user.id);
  const target =
    sessions.find((s) => s.id === requestedSessionId) ??
    sessions.find((s) => s.status === 'in_progress') ??
    sessions[0] ??
    null;

  let view: SessionView | null = null;
  if (target) {
    try {
      view = await loadSessionView(target.id, user.id);
    } catch {
      view = null;
    }
  }

  const runtime = runtimeModeSummary();

  return (
    <AppShell
      title="BITE Office"
      subtitle={view ? view.department.projectTitle : 'Visitor mode'}
      backHref={view ? `/workspace/${view.session.id}` : '/departments'}
      backLabel={view ? 'Workspace' : 'Departments'}
      wide
      right={
        <RuntimeBadges
          persistenceLabel={runtime.persistenceLabel}
          persistenceIsEphemeral={runtime.persistenceIsEphemeral}
          aiLabel={runtime.aiLabel}
          aiModeDowngraded={runtime.aiModeDowngraded}
        />
      }
    >
      <OfficeClient initialView={view} />
    </AppShell>
  );
}
