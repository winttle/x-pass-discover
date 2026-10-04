import 'server-only';
import { env } from '@/lib/env';
import { MockScenarioAIService } from './mock-service';
import { OpenAIScenarioAIService } from './openai-service';
import type { ScenarioAIService } from './types';

let cached: ScenarioAIService | null = null;

/**
 * Resolves the AI adapter for the current environment.
 *
 * Mock is used whenever no OpenAI key is present. If the OpenAI client cannot
 * be constructed we fall back to mock rather than failing the request — but the
 * UI always shows which mode is actually live, so this is never silent.
 */
export function getScenarioAIService(): ScenarioAIService {
  if (cached) return cached;
  if (env.aiMode === 'openai') {
    try {
      cached = new OpenAIScenarioAIService();
      return cached;
    } catch (error) {
      console.error('[ai] falling back to mock mode:', error);
    }
  }
  cached = new MockScenarioAIService();
  return cached;
}

export type {
  ScenarioAIInput,
  ScenarioAIResponse,
  ScenarioAIService,
} from './types';
