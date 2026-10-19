/**
 * Office palette — warm 2.5D.
 *
 * The office is drawn procedurally, so the whole look lives in these values.
 * Light falls from the upper left: of an object's two visible sides, the
 * south face (lower left on screen) is a step darker than its top and the east
 * face (lower right) two steps darker. `art.ts` derives those shades, so each
 * entry here is the colour of a lit top surface.
 */
export type FloorMaterial = 'wood' | 'carpet' | 'stone' | 'tile' | 'walnut';

export const FLOORS: Record<FloorMaterial, { base: number; alt: number; seam: number }> = {
  wood: { base: 0xd9b48a, alt: 0xd1aa7f, seam: 0xb98e62 },
  walnut: { base: 0xb58560, alt: 0xab7b57, seam: 0x8d6243 },
  carpet: { base: 0xcfd3d8, alt: 0xc7cbd1, seam: 0xb7bcc4 },
  stone: { base: 0xeceae6, alt: 0xe3e0db, seam: 0xcfcac2 },
  tile: { base: 0xdfe4ea, alt: 0xd6dce3, seam: 0xbfc7d1 },
};

export const PALETTE = {
  void: 0x1d2433,

  corridor: 'wood' as FloorMaterial,
  threshold: 0x3b82f6,

  backWall: 0xeee8de,
  backWallCap: 0x5b6475,
  windowFrame: 0x4a5366,
  sky: [0xcfe6fb, 0xbcdcf8, 0xaed3f5] as const,
  skyline: [0x9fb9d6, 0x8eaacb, 0xb3c7de] as const,
  partition: 0xe9e6e1,
  partitionCap: 0xc69c70,
  glass: 0xbfe3ff,
  glassFrame: 0x56627a,

  wood: 0xc99a68,
  walnut: 0x8c5e3c,
  tableTop: 0xf3efe8,
  counterTop: 0xf7f5f1,
  counterFront: 0xa97b52,
  shelf: 0xb98a5e,
  binders: [0x2f6fb5, 0xd9a23a, 0x3f9b6e, 0xc1543f, 0x7b6bb8, 0xe0d6c3] as const,
  server: 0x3d4558,
  serverLed: 0x34d399,
  sofa: 0xd8cfc1,
  sofaCushion: 0xe5b44c,
  chair: 0x353b48,
  potWhite: 0xf1efea,
  potClay: 0xc4825a,
  leaf: [0x2f8f55, 0x3fa864, 0x57bd74] as const,
  board: 0xfbfbfa,
  boardFrame: 0x8f97a6,
  boardInk: [0x2563eb, 0x60a5fa, 0x0f1729] as const,
  monitor: 0x262c38,
  monitorGlow: 0x9cc7ff,
  paper: 0xffffff,

  skin: 0xf2c9a5,
  hair: [0x3b2a20, 0x1f1b1a, 0x6b4a33, 0x2b2230] as const,
  pants: 0x2f3442,

  player: 0xf4f6fa,
  playerTrim: 0x2563eb,
  tileGlow: 0x3b82f6,
  shadow: 0x0f1729,

  labelHint: '#93c5fd',
  signInk: '#ffffff',
  signPlate: 0x1d2433,
  nameInk: '#0f1729',
} as const;
