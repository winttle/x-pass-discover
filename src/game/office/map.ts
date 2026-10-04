/**
 * BITE office layout — pure data.
 *
 * The experience layer is generated from this definition: Phaser reads it to
 * build walls, zones and NPC positions, and React reads the same keys to decide
 * which overlay an interaction opens. No business state lives here.
 */

export const TILE = 32;
export const GRID_WIDTH = 46;
export const GRID_HEIGHT = 30;
export const WORLD_WIDTH = GRID_WIDTH * TILE;
export const WORLD_HEIGHT = GRID_HEIGHT * TILE;

export type ZoneAction =
  | { kind: 'info' }
  | { kind: 'resources'; label: string }
  | { kind: 'workspace'; label: string }
  | { kind: 'meeting'; label: string }
  | { kind: 'notifications'; label: string };

export type OfficeRoom = {
  key: string;
  name: string;
  /** Tile-space rectangle, inclusive of x/y, exclusive of x+w / y+h. */
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  action: ZoneAction;
  /** Tiles carved out of the surrounding wall so the room is reachable. */
  doors: Array<{ x: number; y: number }>;
};

export type OfficeCorridor = { x: number; y: number; w: number; h: number };

export type OfficeNpc = {
  key: string;
  /** Matches an `ai_personas` key when this NPC is talkable. */
  personaKey: string | null;
  name: string;
  role: string;
  /** Tile coordinates. */
  x: number;
  y: number;
  color: number;
  /** Step this NPC's conversation belongs to, when talkable. */
  stepKey: string | null;
  prompt: string;
};

export const CORRIDORS: OfficeCorridor[] = [
  { x: 1, y: 9, w: 44, h: 2 },
  { x: 1, y: 20, w: 44, h: 2 },
  { x: 10, y: 9, w: 2, h: 13 },
  { x: 32, y: 9, w: 2, h: 13 },
];

export const ROOMS: OfficeRoom[] = [
  {
    key: 'reception',
    name: 'Reception',
    x: 1, y: 1, w: 10, h: 7,
    color: 0x1e3a5f,
    action: { kind: 'info' },
    doors: [{ x: 5, y: 8 }, { x: 6, y: 8 }],
  },
  {
    key: 'marketing-zone',
    name: 'Marketing Zone',
    x: 13, y: 1, w: 9, h: 7,
    color: 0x4a1d3d,
    action: { kind: 'info' },
    doors: [{ x: 17, y: 8 }, { x: 18, y: 8 }],
  },
  {
    key: 'sales-zone',
    name: 'Sales Zone',
    x: 24, y: 1, w: 9, h: 7,
    color: 0x1b3a63,
    action: { kind: 'info' },
    doors: [{ x: 28, y: 8 }, { x: 29, y: 8 }],
  },
  {
    key: 'product-zone',
    name: 'Product Zone',
    x: 35, y: 1, w: 10, h: 7,
    color: 0x14402c,
    action: { kind: 'info' },
    doors: [{ x: 39, y: 8 }, { x: 40, y: 8 }],
  },
  {
    key: 'strategy-zone',
    name: 'Strategy Zone',
    x: 1, y: 12, w: 9, h: 7,
    color: 0x33215c,
    action: { kind: 'info' },
    doors: [{ x: 5, y: 11 }, { x: 6, y: 11 }, { x: 5, y: 19 }, { x: 6, y: 19 }],
  },
  {
    key: 'hr-zone',
    name: 'HR Zone',
    x: 12, y: 12, w: 9, h: 7,
    color: 0x5a2a0e,
    action: { kind: 'info' },
    doors: [{ x: 16, y: 11 }, { x: 17, y: 11 }, { x: 16, y: 19 }, { x: 17, y: 19 }],
  },
  {
    key: 'data-room',
    name: 'Data Room',
    x: 23, y: 12, w: 9, h: 7,
    color: 0x14364a,
    action: { kind: 'resources', label: 'Browse Files' },
    doors: [{ x: 27, y: 11 }, { x: 28, y: 11 }, { x: 27, y: 19 }, { x: 28, y: 19 }],
  },
  {
    key: 'meeting-room-a',
    name: 'Meeting Room A',
    x: 34, y: 12, w: 5, h: 7,
    color: 0x0f3b38,
    action: { kind: 'meeting', label: 'Start Meeting' },
    doors: [{ x: 36, y: 11 }, { x: 36, y: 19 }],
  },
  {
    key: 'meeting-room-b',
    name: 'Meeting Room B',
    x: 40, y: 12, w: 5, h: 7,
    color: 0x0f3b38,
    action: { kind: 'info' },
    doors: [{ x: 42, y: 11 }, { x: 42, y: 19 }],
  },
  {
    key: 'my-desk',
    name: 'My Desk',
    x: 1, y: 23, w: 12, h: 6,
    color: 0x1c2f52,
    action: { kind: 'workspace', label: 'Open Workspace' },
    doors: [{ x: 6, y: 22 }, { x: 7, y: 22 }],
  },
  {
    key: 'executive-room',
    name: 'Executive Room',
    x: 16, y: 23, w: 12, h: 6,
    color: 0x3d2c12,
    action: { kind: 'info' },
    doors: [{ x: 21, y: 22 }, { x: 22, y: 22 }],
  },
  {
    key: 'notification-area',
    name: 'Notification Area',
    x: 31, y: 23, w: 14, h: 6,
    color: 0x4a2020,
    action: { kind: 'notifications', label: 'Check Messages' },
    doors: [{ x: 37, y: 22 }, { x: 38, y: 22 }],
  },
];

export const NPCS: OfficeNpc[] = [
  {
    key: 'npc-sales-manager',
    personaKey: 'bite-sales-manager',
    name: 'Rin Asakura',
    role: 'Distribution Sales Manager',
    x: 28, y: 4,
    color: 0x2563eb,
    stepKey: 'onboarding',
    prompt: 'Press E to Talk',
  },
  {
    key: 'npc-quickmart-buyer',
    personaKey: 'quickmart-buyer',
    name: 'Yuki Tanaka',
    role: 'Beverage Category Buyer, QuickMart',
    x: 36, y: 15,
    color: 0x0f766e,
    stepKey: 'buyer-meeting',
    prompt: 'Press E to Talk',
  },
  {
    key: 'npc-receptionist',
    personaKey: null,
    name: 'BITE Reception',
    role: 'Welcome desk',
    x: 5, y: 3,
    color: 0x7c8bb0,
    stepKey: null,
    prompt: 'Press E to Talk',
  },
];

export const SPAWN = { x: 5, y: 5 };

/**
 * Builds the collision grid: everything is wall, then rooms, corridors and
 * doors are carved out. Doing it subtractively guarantees every room is sealed
 * except where a door was explicitly placed.
 */
export function buildCollisionGrid(): boolean[][] {
  const grid: boolean[][] = Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => true),
  );

  const carve = (x: number, y: number, w: number, h: number) => {
    for (let row = y; row < y + h; row += 1) {
      for (let col = x; col < x + w; col += 1) {
        if (row >= 0 && row < GRID_HEIGHT && col >= 0 && col < GRID_WIDTH) {
          grid[row][col] = false;
        }
      }
    }
  };

  for (const room of ROOMS) carve(room.x, room.y, room.w, room.h);
  for (const corridor of CORRIDORS) carve(corridor.x, corridor.y, corridor.w, corridor.h);
  for (const room of ROOMS) {
    for (const door of room.doors) carve(door.x, door.y, 1, 1);
  }

  return grid;
}

export const toPixels = (tile: number) => tile * TILE + TILE / 2;
