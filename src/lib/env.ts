import 'server-only';

/**
 * Central environment resolution.
 *
 * The app must run with no credentials at all (file-backed persistence + mock
 * AI), but it must never *pretend* an integration is live. `persistenceMode`
 * and `aiMode` are surfaced in the UI so a developer always knows which
 * adapters are actually in use.
 */

export type PersistenceMode = 'neon' | 'file' | 'memory';
export type AiMode = 'openai' | 'mock';

function readFlag(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

const databaseUrl = readFlag('DATABASE_URL');
const openAiKey = readFlag('OPENAI_API_KEY');
const requestedAiMode = readFlag('X_PASS_AI_MODE');

function resolveAiMode(): AiMode {
  if (requestedAiMode === 'openai') return openAiKey ? 'openai' : 'mock';
  if (requestedAiMode === 'mock') return 'mock';
  // Unset: use the real API only when a key is actually present.
  return openAiKey ? 'openai' : 'mock';
}

const aiMode = resolveAiMode();

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Where runtime state goes.
 *
 * `file` is a real convenience in development: it survives a restart, so a
 * half-finished bootcamp is still there tomorrow. It is NOT viable in a
 * serverless deployment — the filesystem is read-only and per-instance — so a
 * production build with no DATABASE_URL degrades to `memory` and says so
 * loudly rather than crashing on the first save.
 */
function resolvePersistenceMode(): PersistenceMode {
  if (databaseUrl) return 'neon';
  return isProduction ? 'memory' : 'file';
}

export const env = {
  databaseUrl,
  openAiKey,
  openAiModel: readFlag('X_PASS_OPENAI_MODEL') ?? 'gpt-4o-mini',
  aiMode,
  /** True when `X_PASS_AI_MODE=openai` was requested but no key was supplied. */
  aiModeDowngraded: requestedAiMode === 'openai' && !openAiKey,
  persistenceMode: resolvePersistenceMode(),
  appUrl: readFlag('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000',
  authSecret: readFlag('AUTH_SECRET') ?? 'x-pass-insecure-dev-secret',
  authSecretIsDevFallback: !readFlag('AUTH_SECRET'),
  /** Where the file-backed dev store writes. Ignored in `neon` mode. */
  dataDir: readFlag('X_PASS_DATA_DIR') ?? '.data',
  isProduction,
} as const;

/** Developer-facing banner copy; safe to render in the UI. */
export function runtimeModeSummary() {
  return {
    persistence: env.persistenceMode,
    persistenceLabel:
      env.persistenceMode === 'neon'
        ? 'Neon PostgreSQL'
        : env.persistenceMode === 'file'
          ? 'Local file store (no DATABASE_URL)'
          : 'Demo mode — nothing is saved',
    /** True when work will be lost on the next restart. Surfaced in the UI. */
    persistenceIsEphemeral: env.persistenceMode === 'memory',
    ai: env.aiMode,
    aiLabel:
      env.aiMode === 'openai'
        ? `OpenAI (${env.openAiModel})`
        : 'Mock AI (deterministic, no OPENAI_API_KEY)',
    aiModeDowngraded: env.aiModeDowngraded,
  };
}
