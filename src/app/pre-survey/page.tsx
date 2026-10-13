import { redirect } from 'next/navigation';
import { getRepository } from '@/db/repository';
import { AccountMenu } from '@/features/auth/account-menu';
import { SurveyScreen } from '@/features/survey/survey-screen';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * The pre-survey, captured before the work so LIKE can be compared against
 * what the work showed. START in the lobby leads here.
 */
export default async function PreSurveyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const existing = await getRepository().getPreSurvey(user.id);

  return <SurveyScreen initialAnswers={existing?.answers ?? {}} account={<AccountMenu />} />;
}
