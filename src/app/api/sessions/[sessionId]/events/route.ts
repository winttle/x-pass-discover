import { z } from 'zod';
import { getRepository } from '@/db/repository';
import { parseBody, withUser } from '@/lib/api';
import { logEvent } from '@/services/events';
import { requireOwnedSession } from '@/services/scenario/session-service';

/**
 * Client-emitted behavior events (resource opens, office zone entries, NPC
 * interactions). The allow-list keeps the client from writing event types that
 * only the server is entitled to emit, such as `final_submission_created`.
 */
const CLIENT_EVENT_TYPES = [
  'resource_opened',
  'resource_closed',
  'task_started',
  'unexpected_event_viewed',
  'office_zone_entered',
  'npc_interaction_started',
] as const;

const schema = z.object({
  eventType: z.enum(CLIENT_EVENT_TYPES),
  stepKey: z.string().trim().max(120).nullish(),
  taskKey: z.string().trim().max(120).nullish(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  return withUser(async (user) => {
    const body = await parseBody(request, schema);
    const session = await requireOwnedSession(sessionId, user.id);
    await logEvent({
      userId: user.id,
      sessionId: session.id,
      departmentSlug: session.departmentSlug,
      stepKey: body.stepKey ?? null,
      taskKey: body.taskKey ?? null,
      eventType: body.eventType,
      metadata: body.metadata ?? {},
    });
    return { ok: true };
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const limit = Number(new URL(request.url).searchParams.get('limit') ?? 300);
  return withUser(async (user) => {
    await requireOwnedSession(sessionId, user.id);
    const events = await getRepository().listEvents({
      sessionId,
      limit: Number.isFinite(limit) ? Math.min(limit, 1000) : 300,
    });
    return { events };
  });
}
