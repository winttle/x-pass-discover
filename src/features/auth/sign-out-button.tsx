'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Signing out is a state change, so it is a POST rather than a link — a link
 * would let a prefetch or a crawler end someone's session for them.
 */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      // Land on the front door either way. If the request failed the cookie is
      // still there, and the landing page will say so by offering "Continue to
      // BITE" instead of "Enter BITE" — better than a dead button.
      router.push('/');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      data-testid="sign-out"
      className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-body transition-colors hover:border-line-strong hover:bg-sunken hover:text-strong disabled:opacity-40"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
