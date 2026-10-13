import { redirect } from 'next/navigation';
import { getRepository } from '@/db/repository';
import { DEPARTMENTS } from '@/content/departments';
import { AccountMenu } from '@/features/auth/account-menu';
import { StartLobby } from '@/features/lobby/start-lobby';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * The first thing a new account sees: the X-PASS Discover lobby, and one
 * card that starts onboarding. Sign-up and sign-in both land here; anyone who
 * has already taken the pre-survey is past their first day and goes on to
 * the welcome page instead.
 */
export default async function StartPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const survey = await getRepository().getPreSurvey(user.id);
  if (survey) redirect('/welcome');

  return (
    <StartLobby
      directory={DEPARTMENTS.map((department) => department.name)}
      account={<AccountMenu />}
    />
  );
}
