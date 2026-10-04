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

/**
 * Furniture.
 *
 * Props are placed in tile space and rendered procedurally — the office needs
 * no art assets. `solid: true` adds a collision body, which is why
 * `npm run verify:office` re-checks that every room and NPC is still reachable
 * after furniture moves.
 */
export type OfficePropKind =
  | 'desk'
  | 'table'
  | 'counter'
  | 'shelf'
  | 'server'
  | 'sofa'
  | 'chair'
  | 'plant'
  | 'rug'
  | 'board'
  | 'screen';

export type OfficeProp = {
  kind: OfficePropKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  solid?: boolean;
  /** Desks with a monitor read as "someone works here". */
  monitor?: boolean;
  /** Overrides the kind's default colour; used to highlight the player's desk. */
  accent?: number;
};

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
  /** Verb phrase shown next to the E keycap, e.g. "Talk". */
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
    color: 0xe4e9fb,
    action: { kind: 'info' },
    doors: [{ x: 5, y: 8 }, { x: 6, y: 8 }],
  },
  {
    key: 'marketing-zone',
    name: 'Marketing Zone',
    x: 13, y: 1, w: 9, h: 7,
    color: 0xfbe3f0,
    action: { kind: 'info' },
    doors: [{ x: 17, y: 8 }, { x: 18, y: 8 }],
  },
  {
    key: 'sales-zone',
    name: 'Sales Zone',
    x: 24, y: 1, w: 9, h: 7,
    color: 0xdde9fd,
    action: { kind: 'info' },
    doors: [{ x: 28, y: 8 }, { x: 29, y: 8 }],
  },
  {
    key: 'product-zone',
    name: 'Product Zone',
    x: 35, y: 1, w: 10, h: 7,
    color: 0xdef3e4,
    action: { kind: 'info' },
    doors: [{ x: 39, y: 8 }, { x: 40, y: 8 }],
  },
  {
    key: 'strategy-zone',
    name: 'Strategy Zone',
    x: 1, y: 12, w: 9, h: 7,
    color: 0xe9e4fb,
    action: { kind: 'info' },
    doors: [{ x: 5, y: 11 }, { x: 6, y: 11 }, { x: 5, y: 19 }, { x: 6, y: 19 }],
  },
  {
    key: 'hr-zone',
    name: 'HR Zone',
    x: 12, y: 12, w: 9, h: 7,
    color: 0xfceadb,
    action: { kind: 'info' },
    doors: [{ x: 16, y: 11 }, { x: 17, y: 11 }, { x: 16, y: 19 }, { x: 17, y: 19 }],
  },
  {
    key: 'data-room',
    name: 'Data Room',
    x: 23, y: 12, w: 9, h: 7,
    color: 0xdaeefa,
    action: { kind: 'resources', label: 'Browse Files' },
    doors: [{ x: 27, y: 11 }, { x: 28, y: 11 }, { x: 27, y: 19 }, { x: 28, y: 19 }],
  },
  {
    key: 'meeting-room-a',
    name: 'Meeting Room A',
    x: 34, y: 12, w: 5, h: 7,
    color: 0xdcf2ea,
    action: { kind: 'meeting', label: 'Start Meeting' },
    doors: [{ x: 36, y: 11 }, { x: 36, y: 19 }],
  },
  {
    key: 'meeting-room-b',
    name: 'Meeting Room B',
    x: 40, y: 12, w: 5, h: 7,
    color: 0xdcf2ea,
    action: { kind: 'info' },
    doors: [{ x: 42, y: 11 }, { x: 42, y: 19 }],
  },
  {
    key: 'my-desk',
    name: 'My Desk',
    x: 1, y: 23, w: 12, h: 6,
    color: 0xdeebfb,
    action: { kind: 'workspace', label: 'Open Workspace' },
    doors: [{ x: 6, y: 22 }, { x: 7, y: 22 }],
  },
  {
    key: 'executive-room',
    name: 'Executive Room',
    x: 16, y: 23, w: 12, h: 6,
    color: 0xfaf0da,
    action: { kind: 'info' },
    doors: [{ x: 21, y: 22 }, { x: 22, y: 22 }],
  },
  {
    key: 'notification-area',
    name: 'Notification Area',
    x: 31, y: 23, w: 14, h: 6,
    color: 0xfbe2e2,
    action: { kind: 'notifications', label: 'Check Messages' },
    doors: [{ x: 37, y: 22 }, { x: 38, y: 22 }],
  },
];

/**
 * Furniture layout, room by room.
 *
 * Solid props are kept clear of door tiles, the tile just inside each door, the
 * spawn point and every NPC, so the floor plan stays walkable.
 */
export const PROPS: OfficeProp[] = [
  // Reception
  { kind: 'rug', x: 2, y: 4, w: 7, h: 2 },
  { kind: 'counter', x: 3, y: 2, w: 6, h: 1, solid: true },
  { kind: 'sofa', x: 2, y: 6, w: 3, h: 1, solid: true },
  { kind: 'plant', x: 9, y: 1, solid: true },
  { kind: 'plant', x: 9, y: 6, solid: true },
  { kind: 'board', x: 1, y: 1, w: 1, h: 1 },

  // Marketing Zone
  { kind: 'desk', x: 14, y: 2, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'desk', x: 14, y: 5, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'desk', x: 19, y: 2, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'desk', x: 19, y: 5, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'chair', x: 14, y: 3 },
  { kind: 'chair', x: 19, y: 3 },
  { kind: 'chair', x: 14, y: 6 },
  { kind: 'chair', x: 19, y: 6 },
  { kind: 'board', x: 17, y: 1, w: 2, h: 1 },

  // Sales Zone
  { kind: 'desk', x: 25, y: 2, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'desk', x: 25, y: 5, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'desk', x: 30, y: 2, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'desk', x: 30, y: 5, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'chair', x: 25, y: 3 },
  { kind: 'chair', x: 30, y: 3 },
  { kind: 'chair', x: 25, y: 6 },
  { kind: 'chair', x: 30, y: 6 },
  { kind: 'board', x: 27, y: 1, w: 2, h: 1 },
  { kind: 'plant', x: 32, y: 1, solid: true },

  // Product Zone
  { kind: 'shelf', x: 36, y: 1, w: 3, h: 1, solid: true },
  { kind: 'shelf', x: 41, y: 1, w: 3, h: 1, solid: true },
  { kind: 'desk', x: 36, y: 4, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'desk', x: 41, y: 4, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'chair', x: 36, y: 5 },
  { kind: 'chair', x: 41, y: 5 },
  { kind: 'plant', x: 44, y: 7, solid: true },

  // Strategy Zone
  { kind: 'rug', x: 2, y: 13, w: 6, h: 5 },
  { kind: 'table', x: 3, y: 14, w: 4, h: 3, solid: true },
  { kind: 'chair', x: 2, y: 15 },
  { kind: 'chair', x: 7, y: 15 },
  { kind: 'screen', x: 8, y: 12, w: 1, h: 2 },
  { kind: 'plant', x: 1, y: 18, solid: true },

  // HR Zone
  { kind: 'desk', x: 13, y: 13, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'desk', x: 13, y: 16, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'desk', x: 19, y: 13, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'desk', x: 19, y: 16, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'chair', x: 13, y: 14 },
  { kind: 'chair', x: 19, y: 14 },
  { kind: 'plant', x: 12, y: 18, solid: true },

  // Data Room
  { kind: 'shelf', x: 24, y: 13, w: 2, h: 1, solid: true },
  { kind: 'shelf', x: 24, y: 15, w: 2, h: 1, solid: true },
  { kind: 'shelf', x: 24, y: 17, w: 2, h: 1, solid: true },
  { kind: 'shelf', x: 30, y: 13, w: 2, h: 1, solid: true },
  { kind: 'shelf', x: 30, y: 15, w: 2, h: 1, solid: true },
  { kind: 'shelf', x: 30, y: 17, w: 2, h: 1, solid: true },
  { kind: 'server', x: 23, y: 12, solid: true },
  { kind: 'server', x: 23, y: 18, solid: true },

  // Meeting Room A
  { kind: 'rug', x: 34, y: 13, w: 5, h: 5 },
  { kind: 'table', x: 35, y: 16, w: 3, h: 2, solid: true },
  { kind: 'chair', x: 34, y: 16 },
  { kind: 'chair', x: 38, y: 16 },
  { kind: 'screen', x: 34, y: 12, w: 1, h: 2 },

  // Meeting Room B
  { kind: 'rug', x: 40, y: 13, w: 5, h: 5 },
  { kind: 'table', x: 41, y: 16, w: 3, h: 2, solid: true },
  { kind: 'chair', x: 40, y: 16 },
  { kind: 'chair', x: 44, y: 16 },
  { kind: 'screen', x: 40, y: 12, w: 1, h: 2 },

  // My Desk
  { kind: 'rug', x: 3, y: 24, w: 5, h: 3 },
  { kind: 'desk', x: 4, y: 25, w: 3, h: 1, solid: true, monitor: true, accent: 0x3b82f6 },
  { kind: 'chair', x: 5, y: 26 },
  { kind: 'desk', x: 9, y: 24, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'desk', x: 9, y: 27, w: 2, h: 1, solid: true, monitor: true },
  { kind: 'plant', x: 1, y: 28, solid: true },
  { kind: 'plant', x: 12, y: 23, solid: true },

  // Executive Room
  { kind: 'rug', x: 18, y: 24, w: 7, h: 3 },
  { kind: 'desk', x: 19, y: 25, w: 5, h: 1, solid: true, accent: 0xd1a054 },
  { kind: 'chair', x: 21, y: 24 },
  { kind: 'sofa', x: 17, y: 27, w: 3, h: 1, solid: true },
  { kind: 'plant', x: 27, y: 23, solid: true },
  { kind: 'plant', x: 16, y: 28, solid: true },

  // Notification Area
  { kind: 'board', x: 33, y: 23, w: 3, h: 1, solid: true },
  { kind: 'board', x: 40, y: 23, w: 3, h: 1, solid: true },
  { kind: 'screen', x: 37, y: 23, w: 2, h: 1 },
  { kind: 'sofa', x: 33, y: 27, w: 3, h: 1, solid: true },
  { kind: 'plant', x: 44, y: 28, solid: true },
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
    prompt: 'Talk',
  },
  {
    key: 'npc-quickmart-buyer',
    personaKey: 'quickmart-buyer',
    name: 'Yuki Tanaka',
    role: 'Beverage Category Buyer, QuickMart',
    x: 36, y: 14,
    color: 0x0f766e,
    stepKey: 'buyer-meeting',
    prompt: 'Talk',
  },
  {
    key: 'npc-receptionist',
    personaKey: null,
    name: 'BITE Reception',
    role: 'Welcome desk',
    x: 5, y: 3,
    color: 0x7c8bb0,
    stepKey: null,
    prompt: 'Talk',
  },
];

export const SPAWN = { x: 5, y: 5 };

/**
 * The architecture only: everything is wall, then rooms, corridors and doors
 * are carved out. Doing it subtractively guarantees every room is sealed except
 * where a door was explicitly placed.
 *
 * Furniture is NOT included — a desk is an obstacle, not a wall, and it must
 * not be drawn as one.
 */
export function buildWallGrid(): boolean[][] {
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

/**
 * Walls plus solid furniture — what the player can actually walk through.
 * Used for pathing checks; the scene builds the two sets of bodies separately
 * so furniture keeps its own look.
 */
export function buildCollisionGrid(): boolean[][] {
  const grid = buildWallGrid();

  for (const prop of PROPS) {
    if (!prop.solid) continue;
    const w = prop.w ?? 1;
    const h = prop.h ?? 1;
    for (let row = prop.y; row < prop.y + h; row += 1) {
      for (let col = prop.x; col < prop.x + w; col += 1) {
        if (row >= 0 && row < GRID_HEIGHT && col >= 0 && col < GRID_WIDTH) {
          grid[row][col] = true;
        }
      }
    }
  }

  return grid;
}

export const toPixels = (tile: number) => tile * TILE + TILE / 2;
