import type { OfficeNpc, OfficeRoom } from './map';

/**
 * The words the office draws itself — room signs, action hints, the speech
 * bubble and the in-game prompt. React supplies them in the student's
 * language; the defaults are the English names in `map.ts`.
 */
export type OfficeLabels = {
  room: (room: OfficeRoom) => string;
  /** The verb for an interactive room, e.g. "Browse Files". */
  action: (room: OfficeRoom) => string;
  role: (npc: OfficeNpc) => string;
  talk: string;
  you: string;
  /** The full prompt sentence, for assistive technology. */
  promptTarget: (action: string, target: string) => string;
  promptZone: (action: string) => string;
};

export const ENGLISH_LABELS: OfficeLabels = {
  room: (room) => room.name,
  action: (room) => (room.action.kind === 'info' ? '' : room.action.label),
  role: (npc) => npc.role,
  talk: 'Talk',
  you: 'You',
  promptTarget: (action, target) => `Press E to ${action} — ${target}`,
  promptZone: (action) => `Press E — ${action}`,
};
