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
  /**
   * `text` is the full sentence (used for assistive tech); `action` and
   * `target` let the HUD render a keycap without repeating "Press E".
   */
  | {
      type: 'prompt';
      text: string | null;
      action: string | null;
      target: string | null;
    }
  /** Tile coordinates, emitted only when the player crosses a tile boundary. */
  | { type: 'player_moved'; x: number; y: number }
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
