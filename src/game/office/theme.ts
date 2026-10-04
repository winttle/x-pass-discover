/**
 * Office palette.
 *
 * The office is drawn procedurally — no art assets — so the whole look lives in
 * these values. Room colours stay desaturated so furniture, characters and the
 * interaction prompt remain the brightest things on screen.
 */
export const PALETTE = {
  void: 0x05070e,
  wallTop: 0x4a5f85,
  wallFace: 0x121b30,
  wallEdge: 0x5c74a3,
  wallShadow: 0x02040a,

  corridor: 0x1a2440,
  corridorAlt: 0x1f2a4a,
  grid: 0x33436b,

  doorway: 0x24314f,
  threshold: 0x3b82f6,

  propShadow: 0x02040a,
  deskTop: 0x2f3f63,
  deskEdge: 0x1d2946,
  tableTop: 0x35456b,
  counterTop: 0x3a4a72,
  shelfBody: 0x26324f,
  shelfLine: 0x4a5c87,
  serverBody: 0x1a2338,
  serverLed: 0x34d399,
  sofaBody: 0x3a3050,
  chairBody: 0x28334f,
  plantPot: 0x6b4630,
  plantLeaf: 0x2f9e6a,
  rug: 0x3b82f6,
  boardBody: 0x1e2a44,
  boardInk: 0x7c8bb0,
  screenGlow: 0x60a5fa,
  monitor: 0x101a2e,
  monitorGlow: 0x60a5fa,

  player: 0x3b82f6,
  playerLight: 0x93c5fd,
  shadow: 0x000000,

  labelInk: '#aebbd8',
  labelHint: '#7fb0ff',
  nameInk: '#e6ecf9',
} as const;
