import Image from 'next/image';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/app-shell';
import { Badge } from '@/components/ui';
import { MEDIA } from '@/content/media';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginForm } from '@/features/auth/login-form';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/welcome');

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <LoginForm />
        </div>
      </div>

      {/* The photograph only appears where there is room for it to mean something. */}
      <aside className="relative hidden lg:block">
        <Image
          src={MEDIA.companyExterior.src}
          alt={MEDIA.companyExterior.alt}
          fill
          priority
          sizes="50vw"
          className="object-cover"
          /*
            A half-width column crops a 16:9 frame hard. Favour the right of the
            photograph so the signage and the entrance both survive the crop —
            centred, the sign falls outside the frame.
          */
          style={{ objectPosition: '70% 50%' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(200deg, rgba(15,23,41,0.06) 0%, rgba(15,23,41,0.34) 48%, rgba(15,23,41,0.72) 76%, rgba(15,23,41,0.9) 100%)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <Badge tone="brand" dot className="bg-white/95">
            Welcome to BITE
          </Badge>
          <p className="mt-4 max-w-md text-2xl font-bold leading-snug tracking-tight text-white">
            Step into the company.
            <br />
            Do the work.
            <br />
            Discover your fit.
          </p>
          <p className="mt-3 max-w-sm text-xs leading-relaxed text-white/80">
            Five departments, one company. You will read the real material, meet the
            people who decide, and defend a commercial call.
          </p>
        </div>
        <div className="absolute left-10 top-10">
          <span className="inline-flex items-center rounded-xl bg-white/95 px-3 py-2 shadow-card">
            <Logo size="sm" />
          </span>
        </div>
      </aside>
    </div>
  );
}
