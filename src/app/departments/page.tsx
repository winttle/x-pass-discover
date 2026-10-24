import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { HeroBanner } from '@/components/media';
import { Badge } from '@/components/ui';
import { MEDIA } from '@/content/media';
import { getRepository } from '@/db/repository';
import { listLocalizedDepartments } from '@/content/departments';
import { getLocale, getT } from '@/i18n/server';
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

  const [locale, t] = await Promise.all([getLocale(), getT()]);

  return (
    <AppShell
      title={t('departments.title')}
      subtitle={t('departments.subtitle')}
      backHref="/welcome"
      backLabel={t('departments.backWelcome')}
    >
      <HeroBanner
        src={MEDIA.companyOffice.src}
        alt={MEDIA.companyOffice.alt}
        height="h-40"
        eyebrow={<Badge tone="brand" dot>{t('departments.heroBadge')}</Badge>}
        title={t('departments.subtitle')}
        description={t('departments.heroBody')}
      />

      <div className="mt-5" />

      <DepartmentChooser
        departments={listLocalizedDepartments(locale)}
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
