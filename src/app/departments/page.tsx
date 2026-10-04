import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getRepository } from '@/db/repository';
import { DEPARTMENTS } from '@/content/departments';
import { getCurrentUser } from '@/lib/auth/session';
import { DepartmentChooser } from '@/features/departments/department-chooser';

export default async function DepartmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const repo = getRepository();
  const [selection, sessions] = await Promise.all([
    repo.getDepartmentSelection(user.id),
    repo.listSessionsForUser(user.id),
  ]);

  return (
    <AppShell
      title="Choose 3 of 5 departments"
      subtitle="Same company, different work"
      backHref="/welcome"
      backLabel="Welcome"
    >
      <DepartmentChooser
        departments={DEPARTMENTS}
        initialSelection={selection?.departmentSlugs ?? []}
        sessions={sessions.map((s) => ({
          id: s.id,
          departmentSlug: s.departmentSlug,
          status: s.status,
        }))}
      />
    </AppShell>
  );
}
