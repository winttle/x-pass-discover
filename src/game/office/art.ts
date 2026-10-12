import type * as Phaser from 'phaser';
import { HALF_H, HALF_W } from './iso';
import { PALETTE } from './theme';

/**
 * Procedural 2.5D art.
 *
 * Every drawing here works in the local frame of ONE floor tile: `(u, v)` are
 * the tile's own coordinates from 0 to 1 along tile-space x and y, `z` is
 * height in screen pixels, and the tile's centre on the floor is the origin.
 * The scene bakes each piece into a small texture and places it by projecting
 * the tile — so a desk two tiles long is two pieces, which is what lets the
 * painter's algorithm in `iso.ts` sort the player correctly against it.
 */

type G = Phaser.GameObjects.Graphics;
type Pt = { x: number; y: number };

export type Edges = { w: boolean; e: boolean; n: boolean; s: boolean };
export type Facing = 'n' | 's' | 'e' | 'w';

/** A baked, one-tile drawing. `key` identifies identical pieces so they share a texture. */
export type Piece = { key: string; height: number; draw: (g: G) => void };

export type Look = {
  shirt: number;
  pants: number;
  hair: number;
  skin: number;
  /** A jacket over the shirt; the shirt then only shows at the collar. */
  jacket?: number;
  tie?: number;
};

// ---------------------------------------------------------------- primitives

/** Multiplies toward black (k < 1) or toward white (k > 1). */
export function shade(color: number, k: number): number {
  const channel = (value: number) =>
    k < 1 ? Math.round(value * k) : Math.round(value + (255 - value) * (k - 1));
  const r = channel((color >> 16) & 255);
  const g = channel((color >> 8) & 255);
  const b = channel(color & 255);
  return (r << 16) | (g << 8) | b;
}

export const pt = (u: number, v: number, z: number): Pt => ({
  x: (u - v) * HALF_W,
  y: (u + v - 1) * HALF_H - z,
});

function poly(g: G, points: Pt[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(points, true);
}

/** A quad lying in the plane v = const (a south-facing surface). */
const quadS = (v: number, u0: number, u1: number, z0: number, z1: number) => [
  pt(u0, v, z1),
  pt(u1, v, z1),
  pt(u1, v, z0),
  pt(u0, v, z0),
];

/** A quad lying in the plane u = const (an east-facing surface). */
const quadE = (u: number, v0: number, v1: number, z0: number, z1: number) => [
  pt(u, v0, z1),
  pt(u, v1, z1),
  pt(u, v1, z0),
  pt(u, v0, z0),
];

/** A quad lying flat at height z. */
const quadTop = (u0: number, u1: number, v0: number, v1: number, z: number) => [
  pt(u0, v0, z),
  pt(u1, v0, z),
  pt(u1, v1, z),
  pt(u0, v1, z),
];

type Box = { u0: number; u1: number; v0: number; v1: number; z0: number; z1: number };

/**
 * A lit box. The south face (lower left on screen) and east face (lower right)
 * are the only sides the camera can see; a piece in the middle of a long desk
 * skips both, because its neighbours cover them.
 */
function box(
  g: G,
  b: Box,
  top: number,
  faces: { south?: boolean; east?: boolean; side?: number } = {},
): void {
  const side = faces.side ?? top;
  if (faces.south !== false) poly(g, quadS(b.v1, b.u0, b.u1, b.z0, b.z1), shade(side, 0.86));
  if (faces.east !== false) poly(g, quadE(b.u1, b.v0, b.v1, b.z0, b.z1), shade(side, 0.72));
  poly(g, quadTop(b.u0, b.u1, b.v0, b.v1, b.z1), top);
}

/**
 * The span a piece of a multi-tile object covers in its own tile: inset where
 * the object ends, and slightly past the tile where it continues, so adjacent
 * pieces overlap instead of leaving an anti-aliased seam between them.
 */
function span(edges: Edges, inset: number) {
  const over = 0.03;
  return {
    u0: edges.w ? inset : -over,
    u1: edges.e ? 1 - inset : 1 + over,
    v0: edges.n ? inset : -over,
    v1: edges.s ? 1 - inset : 1 + over,
  };
}

/** Small deterministic hash so decoration varies by tile but never flickers. */
const hash = (...values: number[]) =>
  values.reduce((acc, value) => (Math.imul(acc ^ value, 0x45d9f3b) >>> 0) % 1_000_003, 7);

// --------------------------------------------------------------------- walls

export type WallKind = 'back' | 'low' | 'glass';

/** Windows on the building's back walls, with a city skyline behind them. */
function windowPane(
  g: G,
  quad: (a0: number, a1: number, z0: number, z1: number) => Pt[],
  seed: number,
): void {
  poly(g, quad(0.06, 0.94, 22, 110), PALETTE.windowFrame);
  const bands = PALETTE.sky;
  const top = 106;
  const bottom = 26;
  const step = (top - bottom) / bands.length;
  bands.forEach((color, index) =>
    poly(g, quad(0.1, 0.9, top - step * (index + 1), top - step * index), color),
  );
  // Skyline: three to four towers per pane, heights varied per tile.
  let a = 0.1;
  let index = 0;
  while (a < 0.9) {
    const width = 0.12 + ((hash(seed, index) % 100) / 100) * 0.16;
    const height = 18 + (hash(seed, index, 3) % 40);
    const a1 = Math.min(0.9, a + width);
    poly(g, quad(a, a1, bottom, bottom + height), PALETTE.skyline[index % 3], 0.85);
    // Lit windows on the tower.
    for (let row = 0; row < Math.floor(height / 9); row += 1) {
      if (hash(seed, index, row) % 3 === 0) continue;
      poly(g, quad(a + 0.03, a1 - 0.03, bottom + 4 + row * 9, bottom + 6 + row * 9), 0xf8fbff, 0.5);
    }
    a = a1 + 0.02;
    index += 1;
  }
  // Mullion and sill.
  poly(g, quad(0.48, 0.52, 26, 106), PALETTE.windowFrame, 0.9);
  poly(g, quad(0.04, 0.96, 20, 25), shade(PALETTE.backWall, 1.08));
}

export function wallPiece(
  kind: WallKind,
  faces: { south: boolean; east: boolean },
  variant: number,
): Piece {
  const key = `wall:${kind}:${faces.south ? 's' : ''}${faces.east ? 'e' : ''}:${variant}`;

  if (kind === 'back') {
    const height = 120;
    return {
      key,
      height,
      draw: (g) => {
        const b = { u0: 0, u1: 1, v0: 0, v1: 1, z0: 0, z1: height };
        box(g, b, PALETTE.backWallCap, { ...faces, side: PALETTE.backWall });
        const pillar = variant % 4 === 0;
        if (faces.south) {
          poly(g, quadS(1, 0, 1, 0, 8), shade(PALETTE.walnut, 0.9));
          if (!pillar) windowPane(g, (a0, a1, z0, z1) => quadS(1, a0, a1, z0, z1), variant);
        }
        if (faces.east) {
          poly(g, quadE(1, 0, 1, 0, 8), shade(PALETTE.walnut, 0.8));
          if (!pillar) {
            windowPane(g, (a0, a1, z0, z1) => quadE(1, a0, a1, z0, z1), variant + 101);
          }
        }
      },
    };
  }

  if (kind === 'glass') {
    const height = 62;
    return {
      key,
      height,
      draw: (g) => {
        box(g, { u0: 0, u1: 1, v0: 0, v1: 1, z0: 0, z1: 12 }, PALETTE.partitionCap, {
          ...faces,
          side: PALETTE.partition,
        });
        g.lineStyle(2, PALETTE.glassFrame, 0.9);
        if (faces.south) {
          poly(g, quadS(1, 0, 1, 12, height), PALETTE.glass, 0.28);
          poly(g, quadS(1, 0.1, 0.35, 40, 58), 0xffffff, 0.35);
          g.strokePoints([pt(0, 1, height), pt(1, 1, height)]);
          g.strokePoints([pt(1, 1, 12), pt(1, 1, height)]);
        }
        if (faces.east) {
          poly(g, quadE(1, 0, 1, 12, height), PALETTE.glass, 0.24);
          g.strokePoints([pt(1, 0, height), pt(1, 1, height)]);
          g.strokePoints([pt(1, 0, 12), pt(1, 0, height)]);
        }
      },
    };
  }

  // Interior walls are low cabinet dividers, as in an open-plan office: a wood
  // top, panelled doors on the sides that show, and the odd plant or row of
  // books on top so a long run does not read as a slab.
  const height = 24;
  return {
    key,
    height: 60,
    draw: (g) => {
      box(g, { u0: 0, u1: 1, v0: 0, v1: 1, z0: 0, z1: height }, PALETTE.partitionCap, {
        ...faces,
        side: PALETTE.partition,
      });
      if (faces.south) {
        poly(g, quadS(1, 0, 1, 0, 3), shade(PALETTE.partition, 0.6));
        poly(g, quadS(1, 0.49, 0.51, 4, height - 3), shade(PALETTE.partition, 0.7));
        poly(g, quadS(1, 0.4, 0.46, 12, 15), shade(PALETTE.partition, 0.55));
        poly(g, quadS(1, 0.54, 0.6, 12, 15), shade(PALETTE.partition, 0.55));
      }
      if (faces.east) {
        poly(g, quadE(1, 0, 1, 0, 3), shade(PALETTE.partition, 0.5));
        poly(g, quadE(1, 0.49, 0.51, 4, height - 3), shade(PALETTE.partition, 0.6));
      }
      poly(g, quadTop(0.04, 0.96, 0.04, 0.96, height), shade(PALETTE.partitionCap, 1.12));

      if (variant === 0) {
        box(g, { u0: 0.36, u1: 0.64, v0: 0.36, v1: 0.64, z0: height, z1: height + 8 }, PALETTE.potWhite);
        g.fillStyle(PALETTE.leaf[1], 1);
        g.fillEllipse(-5, -height - 14, 14, 10);
        g.fillEllipse(5, -height - 15, 14, 10);
        g.fillStyle(PALETTE.leaf[2], 1);
        g.fillEllipse(0, -height - 20, 12, 9);
      } else if (variant === 5) {
        [0, 1, 2, 3].forEach((i) =>
          box(
            g,
            { u0: 0.25 + i * 0.1, u1: 0.33 + i * 0.1, v0: 0.4, v1: 0.6, z0: height, z1: height + 10 + (i % 2) * 2 },
            PALETTE.binders[i],
          ),
        );
      }
    },
  };
}

// ----------------------------------------------------------------- furniture

export function deskPiece(
  edges: Edges,
  opts: { monitor: boolean; accent?: number; wood: number; clutter: number },
): Piece {
  const flags = `${+edges.w}${+edges.e}${+edges.n}${+edges.s}`;
  const key = `desk:${flags}:${+opts.monitor}:${opts.accent ?? 0}:${opts.wood}:${opts.clutter % 4}`;
  return {
    key,
    height: 48,
    draw: (g) => {
      const s = span(edges, 0.05);
      // Pedestal under the top, then the top slab.
      box(
        g,
        { ...span(edges, 0.14), z0: 0, z1: 16 },
        shade(opts.wood, 0.7),
        { south: edges.s, east: edges.e },
      );
      box(g, { ...s, z0: 16, z1: 20 }, opts.wood, { south: edges.s, east: edges.e });

      if (opts.accent !== undefined) {
        poly(g, quadTop(0.15, 0.85, 0.4, 0.88, 20.5), opts.accent, 0.85);
      }

      if (opts.monitor) {
        box(g, { u0: 0.42, u1: 0.58, v0: 0.18, v1: 0.3, z0: 20, z1: 22 }, PALETTE.monitor);
        poly(g, quadS(0.26, 0.47, 0.53, 22, 28), PALETTE.monitor);
        poly(g, quadS(0.26, 0.14, 0.86, 26, 46), PALETTE.monitor);
        poly(g, quadS(0.265, 0.18, 0.82, 28.5, 44), PALETTE.monitorGlow, 0.9);
        poly(g, quadS(0.265, 0.22, 0.5, 38, 42), 0xffffff, 0.5);
        poly(g, quadTop(0.3, 0.7, 0.5, 0.66, 20.5), 0xe9edf3);
        return;
      }

      // Everyday clutter so a row of desks does not read as copy-paste.
      switch (opts.clutter % 4) {
        case 0:
          poly(g, quadTop(0.25, 0.6, 0.35, 0.75, 20.5), PALETTE.paper);
          poly(g, quadTop(0.3, 0.65, 0.3, 0.7, 21), shade(PALETTE.paper, 0.96));
          break;
        case 1:
          box(g, { u0: 0.6, u1: 0.72, v0: 0.4, v1: 0.52, z0: 20, z1: 27 }, 0xffffff, {
            side: 0x60a5fa,
          });
          break;
        case 2:
          box(g, { u0: 0.2, u1: 0.62, v0: 0.3, v1: 0.6, z0: 20, z1: 26 }, PALETTE.binders[0], {});
          box(g, { u0: 0.22, u1: 0.6, v0: 0.32, v1: 0.58, z0: 26, z1: 30 }, PALETTE.binders[1], {});
          break;
        default:
          break;
      }
    },
  };
}

export function tablePiece(edges: Edges, opts: { top: number; laptop: boolean }): Piece {
  const flags = `${+edges.w}${+edges.e}${+edges.n}${+edges.s}`;
  return {
    key: `table:${flags}:${opts.top}:${+opts.laptop}`,
    height: 40,
    draw: (g) => {
      if (edges.s && edges.e) {
        box(g, { u0: 0.4, u1: 0.55, v0: 0.4, v1: 0.55, z0: 0, z1: 16 }, PALETTE.monitor);
      }
      box(g, { ...span(edges, 0.08), z0: 14, z1: 18 }, opts.top, {
        south: edges.s,
        east: edges.e,
        side: PALETTE.wood,
      });
      if (opts.laptop) {
        poly(g, quadTop(0.3, 0.7, 0.45, 0.7, 18.5), 0xc9ced8);
        poly(g, quadS(0.45, 0.3, 0.7, 18.5, 32), 0x8a93a6);
        poly(g, quadS(0.455, 0.33, 0.67, 20, 30), PALETTE.monitorGlow, 0.7);
      } else if (edges.n || edges.w) {
        poly(g, quadTop(0.3, 0.6, 0.3, 0.6, 18.5), PALETTE.paper, 0.95);
      }
    },
  };
}

export function counterPiece(edges: Edges): Piece {
  const flags = `${+edges.w}${+edges.e}${+edges.n}${+edges.s}`;
  return {
    key: `counter:${flags}`,
    height: 40,
    draw: (g) => {
      const s = span(edges, 0.04);
      box(g, { ...s, z0: 0, z1: 30 }, PALETTE.counterTop, {
        south: edges.s,
        east: edges.e,
        side: PALETTE.counterFront,
      });
      if (edges.s) poly(g, quadS(s.v1, s.u0, s.u1, 22, 24), PALETTE.threshold, 0.8);
      poly(g, quadTop(s.u0, s.u1, s.v0, s.v1, 30), shade(PALETTE.counterTop, 1.02));
    },
  };
}

export function shelfPiece(edges: Edges, seed: number): Piece {
  const flags = `${+edges.w}${+edges.e}${+edges.n}${+edges.s}`;
  return {
    key: `shelf:${flags}:${seed % 5}`,
    height: 64,
    draw: (g) => {
      const s = span(edges, 0.05);
      box(g, { ...s, z0: 0, z1: 60 }, shade(PALETTE.shelf, 1.05), {
        south: edges.s,
        east: edges.e,
        side: PALETTE.shelf,
      });
      if (!edges.s) return;
      // Three shelves of binders facing the room.
      const rows: Array<[number, number]> = [[5, 20], [23, 38], [41, 56]];
      rows.forEach(([z0, z1], row) => {
        poly(g, quadS(s.v1, s.u0 + 0.04, s.u1 - 0.04, z0 - 1, z1), shade(PALETTE.shelf, 0.55));
        let u = s.u0 + 0.06;
        let index = 0;
        while (u < s.u1 - 0.1) {
          const width = 0.09 + (hash(seed, row, index) % 5) * 0.015;
          const color = PALETTE.binders[hash(seed, row, index, 9) % PALETTE.binders.length];
          const lean = hash(seed, row, index, 4) % 7 === 0 ? 4 : 0;
          poly(g, quadS(s.v1, u, Math.min(u + width, s.u1 - 0.06), z0, z1 - 2 - lean), color);
          poly(g, quadS(s.v1, u + 0.02, Math.min(u + width, s.u1 - 0.06) - 0.02, z0 + 6, z0 + 9), 0xffffff, 0.55);
          u += width + 0.01;
          index += 1;
        }
      });
    },
  };
}

export function serverPiece(): Piece {
  return {
    key: 'server',
    height: 70,
    draw: (g) => {
      box(g, { u0: 0.12, u1: 0.88, v0: 0.15, v1: 0.85, z0: 0, z1: 64 }, shade(PALETTE.server, 1.2), {
        side: PALETTE.server,
      });
      for (let row = 0; row < 7; row += 1) {
        const z = 8 + row * 8;
        poly(g, quadS(0.85, 0.18, 0.82, z, z + 5), shade(PALETTE.server, 0.7));
        poly(g, quadS(0.851, 0.66, 0.7, z + 1.5, z + 3.5), PALETTE.serverLed, row % 2 ? 0.5 : 0.95);
      }
    },
  };
}

export function sofaPiece(edges: Edges, cushion: boolean): Piece {
  const flags = `${+edges.w}${+edges.e}${+edges.n}${+edges.s}`;
  return {
    key: `sofa:${flags}:${+cushion}`,
    height: 36,
    draw: (g) => {
      const s = span(edges, 0.06);
      box(g, { ...s, v0: 0.06, z0: 0, z1: 30 }, shade(PALETTE.sofa, 0.94), {
        south: false,
        east: edges.e,
      });
      box(g, { ...s, v0: 0.3, z0: 0, z1: 14 }, PALETTE.sofa, { south: edges.s, east: edges.e });
      if (edges.w) box(g, { u0: s.u0, u1: s.u0 + 0.14, v0: 0.06, v1: s.v1, z0: 0, z1: 20 }, PALETTE.sofa);
      if (edges.e) box(g, { u0: s.u1 - 0.14, u1: s.u1, v0: 0.06, v1: s.v1, z0: 0, z1: 20 }, PALETTE.sofa);
      if (cushion) {
        box(g, { u0: 0.3, u1: 0.62, v0: 0.32, v1: 0.42, z0: 14, z1: 26 }, PALETTE.sofaCushion);
      }
    },
  };
}

export function plantPiece(seed: number, tall: boolean): Piece {
  const variant = seed % 3;
  return {
    key: `plant:${variant}:${+tall}`,
    height: tall ? 80 : 60,
    draw: (g) => {
      g.fillStyle(PALETTE.shadow, 0.15);
      g.fillEllipse(0, 2, 34, 14);
      const pot = variant === 1 ? PALETTE.potClay : PALETTE.potWhite;
      box(g, { u0: 0.3, u1: 0.7, v0: 0.3, v1: 0.7, z0: 0, z1: 16 }, shade(pot, 0.9), { side: pot });
      poly(g, quadTop(0.33, 0.67, 0.33, 0.67, 16), 0x5b4636);

      const lift = tall ? 22 : 0;
      const leaves: Array<[number, number, number, number]> = [
        [-10, -24 - lift * 0.3, 10, 0],
        [9, -26 - lift * 0.3, 10, 0],
        [0, -32 - lift * 0.6, 12, 1],
        [-7, -40 - lift, 9, 2],
        [8, -42 - lift, 9, 1],
        [0, -50 - lift, 8, 2],
      ];
      if (tall) leaves.push([-12, -58, 8, 2], [10, -60, 7, 1], [0, -70, 7, 2]);
      if (tall) {
        g.lineStyle(2, 0x5b4636, 1);
        g.lineBetween(0, -14, 0, -60);
      }
      leaves.forEach(([x, y, r, tone]) => {
        g.fillStyle(PALETTE.leaf[(tone + variant) % 3], 1);
        g.fillEllipse(x, y, r * 2.2, r * 1.5);
      });
      g.fillStyle(0xffffff, 0.18);
      g.fillEllipse(-3, -48 - lift, 8, 4);
    },
  };
}

/**
 * A freestanding whiteboard or screen. It stands along the object's long axis
 * and faces the camera's side of the room.
 */
export function panelPiece(
  edges: Edges,
  opts: { axis: 'x' | 'y'; screen: boolean; index: number },
): Piece {
  const flags = `${+edges.w}${+edges.e}${+edges.n}${+edges.s}`;
  const along = opts.axis === 'x';
  const start = along ? edges.w : edges.n;
  const end = along ? edges.e : edges.s;
  return {
    key: `panel:${opts.axis}:${flags}:${+opts.screen}:${opts.index % 3}`,
    height: 64,
    draw: (g) => {
      const plane = 0.22;
      const quad = (a0: number, a1: number, z0: number, z1: number) =>
        along ? quadS(plane, a0, a1, z0, z1) : quadE(plane, a0, a1, z0, z1);
      const a0 = start ? 0.06 : -0.03;
      const a1 = end ? 0.94 : 1.03;
      const z0 = opts.screen ? 20 : 16;
      const z1 = opts.screen ? 54 : 60;

      // Legs.
      g.lineStyle(2.5, PALETTE.boardFrame, 1);
      for (const at of [start ? 0.12 : null, end ? 0.88 : null]) {
        if (at === null) continue;
        const [p0] = quad(at, at, 0, 0);
        const [p1] = quad(at, at, z0, z0);
        g.lineBetween(p0.x, p0.y, p1.x, p1.y);
      }

      if (opts.screen) {
        poly(g, quad(a0, a1, z0, z1), PALETTE.monitor);
        poly(g, quad(a0 + (start ? 0.04 : 0), a1 - (end ? 0.04 : 0), z0 + 3, z1 - 3), 0x3b82f6, 0.75);
        poly(g, quad(0.2, 0.7, z1 - 12, z1 - 8), 0xffffff, 0.6);
        poly(g, quad(0.2, 0.5, z1 - 18, z1 - 15), 0xffffff, 0.35);
        return;
      }

      poly(g, quad(a0, a1, z0, z1), PALETTE.boardFrame);
      poly(g, quad(a0 + (start ? 0.03 : 0), a1 - (end ? 0.03 : 0), z0 + 2, z1 - 2), PALETTE.board);
      // Ink: a title, a few lines and a small bar chart, varied per tile.
      const ink = PALETTE.boardInk;
      if (opts.index % 3 === 0) {
        poly(g, quad(0.15, 0.85, z1 - 10, z1 - 7), ink[2], 0.7);
        for (let i = 0; i < 3; i += 1) {
          poly(g, quad(0.15, 0.55 + i * 0.1, z1 - 18 - i * 7, z1 - 16 - i * 7), ink[2], 0.35);
        }
      } else {
        const bars = [10, 16, 13, 24];
        bars.forEach((h, i) => {
          const b0 = 0.18 + i * 0.17;
          poly(g, quad(b0, b0 + 0.1, z0 + 6, z0 + 6 + h), ink[i === 3 ? 0 : 1]);
        });
        poly(g, quad(0.12, 0.9, z0 + 5, z0 + 6), ink[2], 0.5);
      }
    },
  };
}

// ---------------------------------------------------------------- characters

/**
 * A person, feet at the origin.
 *
 * `facing` is screen-relative: `down` and the sides show the face, `up` shows
 * the back of the head. `step` swings arms and legs while walking.
 */
export function drawCharacter(
  g: G,
  look: Look,
  facing: 'up' | 'down' | 'left' | 'right',
  step = 0,
): void {
  g.clear();
  const back = facing === 'up';
  const turn = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
  const swing = Math.sin(step) * 2.5;

  g.fillStyle(PALETTE.shadow, 0.22);
  g.fillEllipse(0, 0, 26, 10);

  // Legs and shoes.
  g.fillStyle(look.pants, 1);
  g.fillRoundedRect(-6, -16 + Math.max(0, swing), 5, 15 - Math.max(0, swing), 2);
  g.fillRoundedRect(1, -16 + Math.max(0, -swing), 5, 15 - Math.max(0, -swing), 2);
  g.fillStyle(0x1b1f29, 1);
  g.fillEllipse(-3.5, -1, 7, 4);
  g.fillEllipse(3.5, -1, 7, 4);

  // Arms behind the torso.
  const sleeve = look.jacket ?? look.shirt;
  g.fillStyle(shade(sleeve, 0.85), 1);
  g.fillRoundedRect(-11, -31 - swing, 4, 15, 2);
  g.fillRoundedRect(7, -31 + swing, 4, 15, 2);
  g.fillStyle(look.skin, 1);
  g.fillCircle(-9, -16 - swing, 2.2);
  g.fillCircle(9, -16 + swing, 2.2);

  // Torso.
  g.fillStyle(sleeve, 1);
  g.fillRoundedRect(-8, -33, 16, 19, 5);
  if (!back) {
    if (look.jacket !== undefined) {
      g.fillStyle(look.shirt, 1);
      g.fillTriangle(-3 + turn, -33, 3 + turn, -33, turn, -24);
      if (look.tie !== undefined) {
        g.fillStyle(look.tie, 1);
        g.fillRect(-1 + turn, -31, 2, 8);
      }
    } else {
      g.fillStyle(shade(look.shirt, 0.88), 1);
      g.fillTriangle(-3 + turn, -33, 3 + turn, -33, turn, -29);
    }
  }
  g.fillStyle(0xffffff, 0.12);
  g.fillRoundedRect(-7, -32, 6, 14, 3);

  // Head.
  g.fillStyle(look.skin, 1);
  g.fillRoundedRect(-8, -50, 16, 17, 7);
  g.fillStyle(look.hair, 1);
  if (back) {
    g.fillRoundedRect(-9, -52, 18, 16, 7);
  } else {
    g.fillRoundedRect(-9, -52, 18, 8, { tl: 7, tr: 7, bl: 2, br: 2 });
    g.fillRect(-9 + (turn > 0 ? 0 : 14), -46, 4, 7);
    g.fillStyle(0x1b1f29, 1);
    g.fillCircle(-3 + turn * 2, -41, 1.3);
    g.fillCircle(3 + turn * 2, -41, 1.3);
    g.fillStyle(shade(look.skin, 0.85), 1);
    g.fillRect(-1.5 + turn * 2, -37, 3, 1);
  }
}

/** A colleague sitting at a desk, for chairs with an `occupant`. */
function drawSeated(g: G, shirt: number, facing: Facing, seed: number): void {
  const back = facing === 'n' || facing === 'w';
  const turn = facing === 'e' || facing === 'n' ? 1 : -1;
  const hair = PALETTE.hair[seed % PALETTE.hair.length];
  const seat = pt(0.5, 0.5, 14);
  g.save();
  g.translateCanvas(seat.x, seat.y);
  g.fillStyle(shade(shirt, 0.85), 1);
  g.fillRoundedRect(-11, -18, 4, 12, 2);
  g.fillRoundedRect(7, -18, 4, 12, 2);
  g.fillStyle(shirt, 1);
  g.fillRoundedRect(-8, -20, 16, 18, 5);
  if (!back) {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(-3 + turn, -20, 3 + turn, -20, turn, -14);
  }
  g.fillStyle(PALETTE.skin, 1);
  g.fillRoundedRect(-8, -37, 16, 17, 7);
  g.fillStyle(hair, 1);
  if (back) {
    g.fillRoundedRect(-9, -39, 18, 16, 7);
  } else {
    g.fillRoundedRect(-9, -39, 18, 8, { tl: 7, tr: 7, bl: 2, br: 2 });
    g.fillStyle(0x1b1f29, 1);
    g.fillCircle(-3 + turn * 2, -28, 1.3);
    g.fillCircle(3 + turn * 2, -28, 1.3);
  }
  g.restore();
}

export function chairPiece(facing: Facing, occupant: number | undefined, seed: number): Piece {
  return {
    key: `chair:${facing}:${occupant ?? 'empty'}:${seed % PALETTE.hair.length}`,
    height: 64,
    draw: (g) => {
      const base = pt(0.5, 0.5, 0);
      g.fillStyle(PALETTE.shadow, 0.18);
      g.fillEllipse(base.x, base.y, 26, 11);
      g.fillStyle(PALETTE.chair, 1);
      g.fillRect(base.x - 1.5, base.y - 12, 3, 12);

      const backrest: Box = {
        n: { u0: 0.26, u1: 0.74, v0: 0.68, v1: 0.78, z0: 14, z1: 36 },
        s: { u0: 0.26, u1: 0.74, v0: 0.22, v1: 0.32, z0: 14, z1: 36 },
        e: { u0: 0.22, u1: 0.32, v0: 0.26, v1: 0.74, z0: 14, z1: 36 },
        w: { u0: 0.68, u1: 0.78, v0: 0.26, v1: 0.74, z0: 14, z1: 36 },
      }[facing];
      // A backrest on the camera's side covers the sitter; one on the far side
      // is covered by them.
      const backInFront = facing === 'n' || facing === 'w';

      box(g, { u0: 0.26, u1: 0.74, v0: 0.26, v1: 0.74, z0: 10, z1: 14 }, PALETTE.chair, {
        side: shade(PALETTE.chair, 1.3),
      });
      if (!backInFront) box(g, backrest, shade(PALETTE.chair, 1.2), { side: PALETTE.chair });
      if (occupant !== undefined) drawSeated(g, occupant, facing, seed);
      if (backInFront) box(g, backrest, shade(PALETTE.chair, 1.2), { side: PALETTE.chair });
    },
  };
}

// --------------------------------------------------------------------- signs

export type SignIcon = 'person' | 'folder' | 'chat' | 'desk' | 'bell' | 'chart' | 'star';

/** Small white glyphs for the room signs, drawn at (0, 0) in a 14px box. */
export function drawSignIcon(g: G, icon: SignIcon): void {
  g.fillStyle(0xffffff, 1);
  g.lineStyle(1.6, 0xffffff, 1);
  switch (icon) {
    case 'person':
      g.fillCircle(7, 4, 3);
      g.fillRoundedRect(2, 8, 10, 6, { tl: 4, tr: 4, bl: 1, br: 1 });
      break;
    case 'folder':
      g.fillRoundedRect(1, 2, 6, 4, 1);
      g.fillRoundedRect(1, 4, 13, 9, 1.5);
      break;
    case 'chat':
      g.fillRoundedRect(1, 1, 13, 9, 3);
      g.fillTriangle(3, 9, 7, 9, 3, 13);
      break;
    case 'desk':
      g.strokeRoundedRect(1, 1, 12, 8, 1.5);
      g.fillRect(6, 9, 2, 3);
      g.fillRect(3, 12, 8, 1.6);
      break;
    case 'bell':
      g.fillRoundedRect(3, 2, 8, 9, { tl: 4, tr: 4, bl: 0, br: 0 });
      g.fillRect(1, 10, 12, 2);
      g.fillCircle(7, 13, 1.6);
      break;
    case 'chart':
      g.fillRect(1, 8, 3, 6);
      g.fillRect(5.5, 5, 3, 9);
      g.fillRect(10, 1, 3, 13);
      break;
    case 'star':
      g.fillTriangle(7, 0, 9, 6, 5, 6);
      g.fillTriangle(1, 5, 13, 5, 7, 10);
      g.fillTriangle(7, 8, 3, 14, 5, 7);
      g.fillTriangle(7, 8, 11, 14, 9, 7);
      break;
    default:
      break;
  }
}
