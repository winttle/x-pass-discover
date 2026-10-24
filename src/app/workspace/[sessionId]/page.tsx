import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getLocale, getT } from '@/i18n/server';
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
    view = await loadSessionView(sessionId, user.id, await getLocale());
  } catch (error) {
    if (error instanceof SessionAccessError) redirect('/departments');
    throw error;
  }

  const t = await getT();

  return (
    <AppShell
      title={view.department.projectTitle}
      subtitle={`${view.department.name} · ${view.scenario.mission}`}
      backHref="/departments"
      backLabel={t('workspace.backDepartments')}
    >
      <WorkspaceClient initialView={view} />
    </AppShell>
  );
}
