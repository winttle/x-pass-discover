import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getRepository } from '@/db/repository';
import { getCurrentUser } from '@/lib/auth/session';
import { PreSurveyForm } from '@/features/survey/pre-survey-form';

export default async function PreSurveyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const existing = await getRepository().getPreSurvey(user.id);

  return (
    <AppShell
      title="Pre-survey"
      subtitle="Captured before the work, so LIKE can be compared against what the work showed"
      backHref="/welcome"
      backLabel="Welcome"
    >
      <PreSurveyForm initialAnswers={existing?.answers ?? {}} />
    </AppShell>
  );
}
