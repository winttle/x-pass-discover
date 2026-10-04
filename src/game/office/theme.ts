/**
 * Office palette — light.
 *
 * The office is drawn procedurally, so the whole look lives in these values.
 * In a light scene the depth cues invert: walls are the *lighter* solid, their
 * shadow does the separating, and furniture is a step darker than the floor so
 * it reads as an object sitting on it.
 */
export const PALETTE = {
  void: 0xe3e8f1,
  wallTop: 0xdae2ed,
  wallFace: 0xa9b6c9,
  wallEdge: 0xe9eef6,
  wallShadow: 0x8694ad,

  corridor: 0xf8fafc,
  corridorAlt: 0xf1f4f9,
  grid: 0xdfe5ef,

  doorway: 0xf8fafc,
  threshold: 0x2563eb,

  propShadow: 0x8e9ab0,
  deskTop: 0xc9d3e4,
  deskEdge: 0xa9b6cc,
  tableTop: 0xd3dceb,
  counterTop: 0xcdd8e9,
  shelfBody: 0xc2cde0,
  shelfLine: 0x93a2bc,
  serverBody: 0xaebacf,
  serverLed: 0x059669,
  sofaBody: 0xc7c6e0,
  chairBody: 0xb6c2d6,
  plantPot: 0xc89272,
  plantLeaf: 0x3fae7c,
  rug: 0x2563eb,
  boardBody: 0xe9eef7,
  boardInk: 0x9aa6bb,
  screenGlow: 0x60a5fa,
  monitor: 0x44506a,
  monitorGlow: 0x7fb0ff,

  player: 0x2563eb,
  playerLight: 0x93c5fd,
  shadow: 0x5b6680,

  labelInk: '#56637a',
  labelHint: '#2563eb',
  nameInk: '#0f1729',
} as const;
