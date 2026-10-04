import type { OfficeNpc, OfficeRoom } from './map';

/**
 * Phaser → React bridge.
 *
 * The office is the experience layer. It reports *what the player did* and
 * nothing else — no task state, no answers, no progress. React decides what an
 * interaction means.
 */

export type OfficeEvent =
  | { type: 'ready' }
  | { type: 'prompt'; text: string | null }
  | { type: 'zone_changed'; room: OfficeRoom | null }
  | { type: 'interact_npc'; npc: OfficeNpc }
  | { type: 'interact_zone'; room: OfficeRoom };

type Listener = (event: OfficeEvent) => void;

export class OfficeBridge {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: OfficeEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
