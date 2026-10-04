import 'server-only';
import { env } from '@/lib/env';
import { DrizzleRepository } from './drizzle-repository';
import { FileRepository } from './file-repository';
import type { XPassRepository } from './types';

declare global {
  var __xPassRepository: XPassRepository | undefined;
}

/**
 * Single entry point for persistence. Cached on `globalThis` so the file-backed
 * dev store keeps one in-process cache across Next.js hot reloads.
 */
export function getRepository(): XPassRepository {
  if (!globalThis.__xPassRepository) {
    globalThis.__xPassRepository =
      env.persistenceMode === 'neon'
        ? new DrizzleRepository()
        : new FileRepository();
  }
  return globalThis.__xPassRepository;
}

export type { XPassRepository } from './types';
