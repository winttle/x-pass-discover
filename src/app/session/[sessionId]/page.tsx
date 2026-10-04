import { redirect } from 'next/navigation';

/** `/session/[id]` is the stable session URL; the work UI lives at /workspace. */
export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  redirect(`/workspace/${sessionId}`);
}
