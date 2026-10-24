import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { AuthLayout } from '@/features/auth/auth-layout';
import { SignupForm } from '@/features/auth/signup-form';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  if (await getCurrentUser()) redirect('/welcome');

  // Carried over when sign-in could not find the address, so the student does
  // not type it twice.
  const { email } = await searchParams;

  return (
    <AuthLayout>
      <SignupForm initialEmail={email ?? ''} />
    </AuthLayout>
  );
}
