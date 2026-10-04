import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginForm } from '@/features/auth/login-form';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/welcome');
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-16">
      <LoginForm />
    </div>
  );
}
