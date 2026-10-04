import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getCurrentUser } from '@/lib/auth/session';
import {
  SessionAccessError,
  loadSessionView,
} from '@/services/scenario/session-service';
import { WorkspaceClient } from '@/features/workspace/workspace-client';

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  let view;
  try {
    view = await loadSessionView(sessionId, user.id);
  } catch (error) {
    if (error instanceof SessionAccessError) redirect('/departments');
    throw error;
  }

  return (
    <AppShell
      title={view.department.projectTitle}
      subtitle={`${view.department.name} · ${view.scenario.mission}`}
      backHref="/departments"
      backLabel="Departments"
    >
      <WorkspaceClient initialView={view} />
    </AppShell>
  );
}
