import 'server-only';
import { getRepository } from '@/db/repository';
import type { BehaviorEvent, BehaviorEventType } from '@/types/runtime';

/**
 * Behavior event logging.
 *
 * These events are contextual EVIDENCE, never points. Nothing in this codebase
 * may convert an event count, a duration or a message total directly into a
 * skill score — see `09_ACCEPTANCE` / scenario spec §11.
 *
 * Logging must never break the student's flow, so failures are swallowed and
 * reported to the server console only.
 */
export async function logEvent(input: {
  userId: string;
  sessionId: string | null;
  departmentSlug?: string | null;
  stepKey?: string | null;
  taskKey?: string | null;
  eventType: BehaviorEventType;
  metadata?: Record<string, unknown>;
}): Promise<BehaviorEvent | null> {
  try {
    return await getRepository().recordEvent(input);
  } catch (error) {
    console.error('[behavior-events] failed to record event', input.eventType, error);
    return null;
  }
}

export async function logEvents(
  inputs: Parameters<typeof logEvent>[0][],
): Promise<void> {
  await Promise.all(inputs.map((input) => logEvent(input)));
}
