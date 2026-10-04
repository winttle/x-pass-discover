import { z } from 'zod';
import { getResource } from '@/content/registry';
import { parseBody, withUser } from '@/lib/api';
import { logEvent } from '@/services/events';
import { requireOwnedSession } from '@/services/scenario/session-service';

const schema = z.object({
  stepKey: z.string().trim().max(120).nullish(),
});

/** Opening a resource is logged as evidence. Resource count is never a score. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; resourceKey: string }> },
) {
  const { sessionId, resourceKey } = await params;
  return withUser(async (user) => {
    const body = await parseBody(request, schema).catch(() => ({ stepKey: null }));
    const session = await requireOwnedSession(sessionId, user.id);
    const resource = getResource(session.scenarioKey, resourceKey);
    if (!resource) throw new Error(`Unknown resource: ${resourceKey}`);

    await logEvent({
      userId: user.id,
      sessionId: session.id,
      departmentSlug: session.departmentSlug,
      stepKey: body.stepKey ?? null,
      eventType: 'resource_opened',
      metadata: { resourceKey, resourceType: resource.resourceType },
    });
    return { ok: true };
  });
}
