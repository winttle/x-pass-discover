import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { HeroBanner } from '@/components/media';
import { Badge } from '@/components/ui';
import { MEDIA } from '@/content/media';
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
      <HeroBanner
        src={MEDIA.companyOffice.src}
        alt={MEDIA.companyOffice.alt}
        height="h-40"
        eyebrow={<Badge tone="brand" dot>1 department = 1 bootcamp</Badge>}
        title="Same company, different work"
        description="Every bootcamp happens inside BITE. What changes is the job you do — the people you talk to, the material you read, and the decision you have to defend."
      />

      <div className="mt-5" />

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
