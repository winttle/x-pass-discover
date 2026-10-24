import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { AuthLayout } from '@/features/auth/auth-layout';
import { LoginForm } from '@/features/auth/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  if (await getCurrentUser()) redirect('/welcome');

  // Carried over when sign-up found the address already taken.
  const { email } = await searchParams;

  return (
    <AuthLayout>
      <LoginForm initialEmail={email ?? ''} />
    </AuthLayout>
  );
}
