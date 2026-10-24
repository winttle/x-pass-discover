import { z } from 'zod';
import { getLocale } from '@/i18n/server';
import { parseBody, withUser } from '@/lib/api';
import { ScenarioRuleError } from '@/lib/errors';
import {
  assertPersonaAllowedInStep,
  buildConversationView,
  endConversation,
  openConversation,
  sendStudentMessage,
} from '@/services/ai/conversation-service';
import {
  loadSessionView,
  requireOwnedSession,
} from '@/services/scenario/session-service';

const schema = z.object({
  personaKey: z.string().trim().min(1),
  stepKey: z.string().trim().min(1),
  action: z.enum(['open', 'send', 'end']),
  message: z.string().trim().min(1).max(4000).optional(),
});

/**
 * Single endpoint for the AI panel. Persona reachability is checked
 * server-side: a client cannot open a persona from a step that does not
 * declare it, which is what keeps hidden facts tied to the right scene.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  return withUser(async (user) => {
    const body = await parseBody(request, schema);
    const session = await requireOwnedSession(sessionId, user.id);
    assertPersonaAllowedInStep(session, body.personaKey, body.stepKey);
    const locale = await getLocale();

    if (body.action === 'open') {
      return {
        conversation: await openConversation(
          session,
          body.personaKey,
          body.stepKey,
          locale,
        ),
      };
    }

    if (body.action === 'send') {
      if (!body.message) throw new ScenarioRuleError('message is required');
      const conversation = await sendStudentMessage(
        session,
        body.personaKey,
        body.stepKey,
        body.message,
        locale,
      );
      return { conversation };
    }

    const conversation = await endConversation(
      session,
      body.personaKey,
      body.stepKey,
      locale,
    );
    return {
      conversation,
      // Ending a meeting can unlock the next step, so hand back fresh state.
      view: await loadSessionView(sessionId, user.id, locale),
    };
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const url = new URL(request.url);
  const personaKey = url.searchParams.get('personaKey');
  const stepKey = url.searchParams.get('stepKey');

  return withUser(async (user) => {
    if (!personaKey || !stepKey) {
      throw new ScenarioRuleError('personaKey and stepKey are required');
    }
    const session = await requireOwnedSession(sessionId, user.id);
    assertPersonaAllowedInStep(session, personaKey, stepKey);
    return {
      conversation: await buildConversationView(
        session,
        personaKey,
        stepKey,
        await getLocale(),
      ),
    };
  });
}
