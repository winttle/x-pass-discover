import type * as Phaser from 'phaser';
import { HALF_H, HALF_W } from './iso';
import { PALETTE } from './theme';

/**
 * Procedural 2.5D art, painted with the Canvas 2D API.
 *
 * Every drawing here works in the local frame of ONE floor tile: `(u, v)` are
 * the tile's own coordinates from 0 to 1 along tile-space x and y, `z` is
 * height in screen pixels, and the tile's centre on the floor is the origin.
 * The scene bakes each piece into a small canvas texture (at 2× for crispness)
 * and places it by projecting the tile — so a desk two tiles long is two
 * pieces, which is what lets the painter's algorithm in `iso.ts` sort the
 * player correctly against it.
 *
 * The trick that keeps this readable is *face space*: `onSouth`, `onEast` and
 * `onTop` skew the canvas so that a side or top of a box can be painted as an
 * ordinary flat rectangle — wood grain, a window, a line of text — and lands
 * in perspective.
 */

export type Ctx = CanvasRenderingContext2D;
type Pt = { x: number; y: number };

export type Edges = { w: boolean; e: boolean; n: boolean; s: boolean };
export type Facing = 'n' | 's' | 'e' | 'w';

/** A baked, one-tile drawing. `key` identifies identical pieces so they share a texture. */
export type Piece = { key: string; height: number; draw: (ctx: Ctx) => void };

export type Look = {
  shirt: number;
  pants: number;
  hair: number;
  skin: number;
  /** A jacket over the shirt; the shirt then only shows at the collar. */
  jacket?: number;
  tie?: number;
  /** Long hair falls past the collar. */
  long?: boolean;
};

/** Face-space length of one tile edge. */
const T = 32;

// ---------------------------------------------------------------- primitives

/** Multiplies toward black (k < 1) or toward white (k > 1). */
export function shade(color: number, k: number): number {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, k < 1 ? Math.round(value * k) : Math.round(value + (255 - value) * (k - 1))));
  const r = channel((color >> 16) & 255);
  const g = channel((color >> 8) & 255);
  const b = channel(color & 255);
  return (r << 16) | (g << 8) | b;
}

export const rgb = (color: number, alpha = 1) =>
  `rgba(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255},${alpha})`;

/** Small deterministic PRNG so decoration varies by tile but never flickers. */
export function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pt = (u: number, v: number, z: number): Pt => ({
  x: (u - v) * HALF_W,
  y: (u + v - 1) * HALF_H - z,
});

/** Paints on the plane v = const. X = u·32 runs left→right, Y = −z. */
export function onSouth(ctx: Ctx, v: number, draw: () => void): void {
  const o = pt(0, v, 0);
  ctx.save();
  ctx.transform(1, 0.5, 0, 1, o.x, o.y);
  draw();
  ctx.restore();
}

/** Paints on the plane u = const. X = (1 − v)·32 runs left→right, Y = −z. */
export function onEast(ctx: Ctx, u: number, draw: () => void): void {
  const o = pt(u, 1, 0);
  ctx.save();
  ctx.transform(1, -0.5, 0, 1, o.x, o.y);
  draw();
  ctx.restore();
}

/** Paints flat at height z. X = u·32, Y = v·32. */
export function onTop(ctx: Ctx, z: number, draw: () => void): void {
  const o = pt(0, 0, z);
  ctx.save();
  ctx.transform(1, 0.5, -1, 0.5, o.x, o.y);
  draw();
  ctx.restore();
}

/** A surface: a flat colour (lit with a soft gradient) or a painter. */
type Painter = (ctx: Ctx, w: number, h: number) => void;
type Paint = number | Painter;

/** Fills a face-space rectangle; `k` darkens it for the side it is on. */
function paintRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  paint: Paint,
  k: number,
): void {
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  if (typeof paint === 'number') {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, rgb(shade(paint, k * 1.04)));
    grad.addColorStop(1, rgb(shade(paint, k * 0.9)));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    paint(ctx, w, h);
    if (k < 1) {
      ctx.fillStyle = `rgba(18,22,34,${(1 - k) * 0.9})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
  ctx.restore();
}

type Box = { u0: number; u1: number; v0: number; v1: number; z0: number; z1: number };

/**
 * A lit box. The south face (lower left on screen) and east face (lower right)
 * are the only sides the camera can see; a piece in the middle of a long desk
 * skips both, because its neighbours cover them. Front top edges catch the
 * light, which is most of what makes a box read as solid.
 */
function box(
  ctx: Ctx,
  b: Box,
  top: Paint,
  sides: Paint = top,
  faces: { south?: boolean; east?: boolean } = {},
): void {
  const south = faces.south !== false;
  const east = faces.east !== false;
  if (south) {
    onSouth(ctx, b.v1, () =>
      paintRect(ctx, b.u0 * T, -b.z1, (b.u1 - b.u0) * T, b.z1 - b.z0, sides, 0.86),
    );
  }
  if (east) {
    onEast(ctx, b.u1, () =>
      paintRect(ctx, (1 - b.v1) * T, -b.z1, (b.v1 - b.v0) * T, b.z1 - b.z0, sides, 0.7),
    );
  }
  onTop(ctx, b.z1, () =>
    paintRect(ctx, b.u0 * T, b.v0 * T, (b.u1 - b.u0) * T, (b.v1 - b.v0) * T, top, 1),
  );
  ctx.save();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  if (south) {
    const a = pt(b.u0, b.v1, b.z1);
    const c = pt(b.u1, b.v1, b.z1);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, c.y);
  }
  if (east) {
    const a = pt(b.u1, b.v1, b.z1);
    const c = pt(b.u1, b.v0, b.z1);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(c.x, c.y);
  }
  ctx.stroke();
  ctx.restore();
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

const flagsOf = (e: Edges) => `${+e.w}${+e.e}${+e.n}${+e.s}`;

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Text that stays legible when baked small. */
function label(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 600,
  align: CanvasTextAlign = 'left',
): void {
  ctx.font = `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

// ----------------------------------------------------------------- materials

/** Wood with grain. `offset`/`length` keep the grain continuous across pieces. */
function wood(base: number, seed: number, offset = 0, length = T): Painter {
  return (ctx, w, h) => {
    ctx.fillStyle = rgb(base);
    ctx.fillRect(0, 0, w, h);
    const r = rng(seed);
    ctx.save();
    ctx.translate(-offset, 0);
    const lines = Math.max(4, Math.round(h / 2.2));
    for (let i = 0; i < lines; i += 1) {
      const y = r() * h;
      ctx.strokeStyle = rgb(shade(base, 0.72 + r() * 0.12), 0.18 + r() * 0.22);
      ctx.lineWidth = 0.35 + r() * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(length * 0.33, y + (r() - 0.5) * 2.5, length * 0.66, y + (r() - 0.5) * 2.5, length + 4, y + (r() - 0.5) * 2);
      ctx.stroke();
    }
    ctx.restore();
    const sheen = ctx.createLinearGradient(0, 0, w, h);
    sheen.addColorStop(0, 'rgba(255,255,255,0.14)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
  };
}

/** Painted plaster or laminate: flat colour with a faint mottle. */
function matte(base: number, seed: number): Painter {
  return (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, rgb(shade(base, 1.03)));
    grad.addColorStop(1, rgb(shade(base, 0.93)));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    const r = rng(seed);
    for (let i = 0; i < (w * h) / 18; i += 1) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.035)';
      ctx.fillRect(r() * w, r() * h, 0.8, 0.8);
    }
  };
}

/** Brushed metal. */
function metal(base: number): Painter {
  return (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, rgb(shade(base, 1.15)));
    grad.addColorStop(0.5, rgb(base));
    grad.addColorStop(1, rgb(shade(base, 0.85)));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  };
}

// --------------------------------------------------------------------- walls

export type WallKind = 'back' | 'low' | 'glass';

export type WallDecorSlice = {
  kind: 'motto' | 'frame' | 'clock' | 'notice';
  text?: string[];
  /** Which tile of the decoration this wall tile shows, and of how many. */
  index: number;
  width: number;
};

/** A tall office window with a city behind it, painted in south-face space. */
function paintWindow(ctx: Ctx, seed: number): void {
  const x0 = 2;
  const x1 = T - 2;
  const top = -110;
  const bottom = -24;
  // Frame.
  ctx.fillStyle = rgb(PALETTE.windowFrame);
  ctx.fillRect(x0, top, x1 - x0, bottom - top);
  // Sky.
  const sky = ctx.createLinearGradient(0, top, 0, bottom);
  sky.addColorStop(0, '#9fcaf2');
  sky.addColorStop(0.55, '#cfe5f8');
  sky.addColorStop(1, '#eef5fb');
  ctx.fillStyle = sky;
  ctx.fillRect(x0 + 2, top + 2, x1 - x0 - 4, bottom - top - 4);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 + 2, top + 2, x1 - x0 - 4, bottom - top - 4);
  ctx.clip();
  const r = rng(seed);
  // A cloud.
  if (r() > 0.4) {
    ellipse(ctx, 6 + r() * 20, top + 14 + r() * 10, 8, 2.6, 'rgba(255,255,255,0.75)');
  }
  // Far skyline, then near skyline with lit windows.
  for (const [layer, color, minH, maxH] of [
    [0, '#b9cde2', 18, 46],
    [1, '#8ea9c8', 10, 34],
  ] as const) {
    let x = x0 - 4 + r() * 4;
    while (x < x1) {
      const w = 5 + r() * 7;
      const h = minH + r() * (maxH - minH);
      ctx.fillStyle = color;
      ctx.fillRect(x, bottom - 2 - h, w, h + 2);
      if (layer === 1) {
        for (let wy = bottom - h + 2; wy < bottom - 4; wy += 4) {
          for (let wx = x + 1.2; wx < x + w - 1.5; wx += 2.6) {
            if (r() > 0.55) {
              ctx.fillStyle = r() > 0.5 ? 'rgba(255,246,214,0.85)' : 'rgba(225,238,250,0.6)';
              ctx.fillRect(wx, wy, 1.2, 1.6);
            }
          }
        }
      }
      x += w + 0.6 + r() * 2;
    }
  }
  // Reflections on the glass.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0 + 4, top + 40);
  ctx.lineTo(x0 + 18, top + 8);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0 + 9, top + 44);
  ctx.lineTo(x0 + 23, top + 12);
  ctx.stroke();
  ctx.restore();
  // Transom and sill.
  ctx.fillStyle = rgb(PALETTE.windowFrame);
  ctx.fillRect(x0, top + 30, x1 - x0, 2);
  ctx.fillStyle = rgb(shade(PALETTE.backWall, 1.1));
  ctx.fillRect(x0 - 1.5, bottom, x1 - x0 + 3, 2.5);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x0 - 1.5, bottom + 2.5, x1 - x0 + 3, 1.2);
}

/** A decoration hung across several wall tiles, clipped to this tile's share. */
function paintDecor(ctx: Ctx, decor: WallDecorSlice): void {
  const width = decor.width * T;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, -130, T, 130);
  ctx.clip();
  ctx.translate(-decor.index * T, 0);
  switch (decor.kind) {
    case 'motto': {
      const x = 6;
      const w = width - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + 1.5, -96 + 2, w, 38);
      ctx.fillStyle = rgb(0x6b4a33);
      ctx.fillRect(x - 1.5, -97.5, w + 3, 41);
      ctx.fillStyle = '#f7f1e6';
      ctx.fillRect(x, -96, w, 38);
      const lines = decor.text ?? [];
      lines.forEach((line, i) =>
        label(ctx, line, x + w / 2, -82 + i * 12, 8.5, '#3b2f27', 600, 'center'),
      );
      break;
    }
    case 'notice': {
      const x = 8;
      const w = width - 16;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + 1.5, -104 + 2, w, 56);
      ctx.fillStyle = '#2f3a2c';
      ctx.fillRect(x, -104, w, 56);
      (decor.text ?? []).forEach((line, i) =>
        label(ctx, line, x + w / 2, -90 + i * 12, 8.5, i % 2 ? '#e6f2d8' : '#ffffff', 700, 'center'),
      );
      break;
    }
    case 'frame': {
      const x = 7;
      const w = width - 14;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 1.5, -98 + 2, w, 44);
      ctx.fillStyle = '#20242e';
      ctx.fillRect(x - 1.5, -99.5, w + 3, 47);
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(x + 2, -96, w - 4, 40);
      const art = ctx.createLinearGradient(0, -92, 0, -60);
      art.addColorStop(0, '#f2c27b');
      art.addColorStop(1, '#d9785f');
      ctx.fillStyle = art;
      ctx.fillRect(x + 6, -92, w - 12, 32);
      ellipse(ctx, x + w * 0.65, -82, 5, 5, 'rgba(255,240,200,0.9)');
      ctx.fillStyle = '#5e6f8f';
      ctx.beginPath();
      ctx.moveTo(x + 6, -60);
      ctx.lineTo(x + w * 0.35, -78);
      ctx.lineTo(x + w * 0.6, -66);
      ctx.lineTo(x + w * 0.8, -74);
      ctx.lineTo(x + w - 6, -64);
      ctx.lineTo(x + w - 6, -60);
      ctx.fill();
      break;
    }
    case 'clock': {
      const cx = width / 2;
      const cy = -88;
      ellipse(ctx, cx + 1.2, cy + 1.5, 10, 10, 'rgba(0,0,0,0.2)');
      ellipse(ctx, cx, cy, 10, 10, '#2b303b');
      ellipse(ctx, cx, cy, 8.4, 8.4, '#fbfaf7');
      ctx.strokeStyle = '#2b303b';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 3.5, cy - 3);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - 6);
      ctx.stroke();
      ctx.strokeStyle = '#d9483b';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 2);
      ctx.lineTo(cx - 3, cy - 5.5);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

export function wallPiece(
  kind: WallKind,
  faces: { south: boolean; east: boolean },
  variant: number,
  opts: { window?: boolean; decor?: WallDecorSlice } = {},
): Piece {
  const decorKey = opts.decor ? `${opts.decor.kind}${opts.decor.index}/${opts.decor.width}:${opts.decor.text?.join('|') ?? ''}` : '';
  const key = `wall:${kind}:${faces.south ? 's' : ''}${faces.east ? 'e' : ''}:${variant}:${+!!opts.window}:${decorKey}`;

  if (kind === 'back') {
    const height = 120;
    return {
      key,
      height: height + 4,
      draw: (ctx) => {
        const plaster = matte(PALETTE.backWall, variant);
        box(ctx, { u0: 0, u1: 1, v0: 0, v1: 1, z0: 0, z1: height }, PALETTE.backWallCap, plaster, faces);
        const finish = () => {
          // Skirting board and crown moulding.
          ctx.fillStyle = rgb(PALETTE.walnut);
          ctx.fillRect(0, -9, T, 9);
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(0, -9, T, 1);
          ctx.fillStyle = rgb(shade(PALETTE.backWall, 1.08));
          ctx.fillRect(0, -height, T, 4);
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          ctx.fillRect(0, -height + 4, T, 2);
          if (opts.window) paintWindow(ctx, variant * 7 + 3);
          if (opts.decor) paintDecor(ctx, opts.decor);
        };
        if (faces.south) onSouth(ctx, 1, finish);
        if (faces.east) {
          onEast(ctx, 1, () => {
            finish();
            ctx.fillStyle = 'rgba(18,22,34,0.16)';
            ctx.fillRect(0, -height, T, height);
          });
        }
      },
    };
  }

  if (kind === 'glass') {
    const height = 64;
    return {
      key,
      height,
      draw: (ctx) => {
        box(ctx, { u0: 0, u1: 1, v0: 0, v1: 1, z0: 0, z1: 10 }, wood(PALETTE.partitionCap, variant), PALETTE.partition, faces);
        const pane = () => {
          const glass = ctx.createLinearGradient(0, -height, T, -10);
          glass.addColorStop(0, 'rgba(214,236,255,0.42)');
          glass.addColorStop(0.5, 'rgba(190,225,255,0.18)');
          glass.addColorStop(1, 'rgba(214,236,255,0.34)');
          ctx.fillStyle = glass;
          ctx.fillRect(0, -height, T, height - 10);
          // A frosted privacy band.
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(0, -40, T, 7);
          // Reflection.
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(6, -14);
          ctx.lineTo(16, -58);
          ctx.stroke();
          // Aluminium frame.
          ctx.fillStyle = rgb(PALETTE.glassFrame);
          ctx.fillRect(0, -height, T, 2);
          ctx.fillRect(T - 1.5, -height, 1.5, height - 10);
        };
        if (faces.south) onSouth(ctx, 1, pane);
        if (faces.east) onEast(ctx, 1, pane);
      },
    };
  }

  // Interior walls are low cabinet dividers, as in an open-plan office: a wood
  // top, panelled doors on the sides that show, and the odd plant or row of
  // books on top so a long run does not read as a slab.
  const height = 24;
  return {
    key,
    height: 64,
    draw: (ctx) => {
      const doors: Paint = (c, w, h) => {
        c.fillStyle = rgb(PALETTE.partition);
        c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(0,0,0,0.12)';
        c.fillRect(w / 2 - 0.4, 2, 0.8, h - 5);
        c.fillRect(0, h - 3, w, 3);
        c.fillStyle = rgb(0x9aa3b2);
        c.fillRect(w / 2 - 4, h / 2 - 1, 2.5, 1.2);
        c.fillRect(w / 2 + 1.5, h / 2 - 1, 2.5, 1.2);
        const sheen = c.createLinearGradient(0, 0, 0, h);
        sheen.addColorStop(0, 'rgba(255,255,255,0.15)');
        sheen.addColorStop(1, 'rgba(0,0,0,0.08)');
        c.fillStyle = sheen;
        c.fillRect(0, 0, w, h);
      };
      box(ctx, { u0: 0, u1: 1, v0: 0, v1: 1, z0: 0, z1: height }, wood(PALETTE.partitionCap, variant * 13, 0, T), doors, faces);

      if (variant === 0) {
        smallPlant(ctx, 0.5, 0.5, height);
      } else if (variant === 5) {
        books(ctx, 0.25, 0.75, 0.42, 0.62, height, variant);
      }
    },
  };
}

function smallPlant(ctx: Ctx, u: number, v: number, z: number): void {
  box(ctx, { u0: u - 0.13, u1: u + 0.13, v0: v - 0.13, v1: v + 0.13, z0: z, z1: z + 8 }, PALETTE.potWhite);
  const base = pt(u, v, z + 8);
  const r = rng(Math.round(u * 100 + v * 10));
  for (let i = 0; i < 9; i += 1) {
    const angle = -Math.PI / 2 + (r() - 0.5) * 2.4;
    const len = 6 + r() * 5;
    ctx.save();
    ctx.translate(base.x, base.y);
    ctx.rotate(angle);
    ctx.fillStyle = rgb(PALETTE.leaf[i % 3]);
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, len / 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function books(ctx: Ctx, u0: number, u1: number, v0: number, v1: number, z: number, seed: number): void {
  const r = rng(seed + 11);
  let u = u0;
  let i = 0;
  while (u < u1 - 0.05) {
    const w = 0.06 + r() * 0.05;
    box(ctx, { u0: u, u1: u + w, v0, v1, z0: z, z1: z + 8 + r() * 5 }, PALETTE.binders[i % PALETTE.binders.length]);
    u += w + 0.005;
    i += 1;
  }
}

// ----------------------------------------------------------------- furniture

/** Where a piece sits along its object: which tile, out of how many. */
type Along = { index: number; length: number };

function monitor(ctx: Ctx, u: number, v: number, z: number, seed: number): void {
  // Stand.
  box(ctx, { u0: u - 0.1, u1: u + 0.1, v0: v - 0.06, v1: v + 0.06, z0: z, z1: z + 1.5 }, 0x3a404c);
  box(ctx, { u0: u - 0.025, u1: u + 0.025, v0: v - 0.02, v1: v + 0.02, z0: z, z1: z + 9 }, 0x3a404c);
  onSouth(ctx, v + 0.02, () => {
    const x = (u - 0.34) * T;
    const w = 0.68 * T;
    ctx.fillStyle = '#1f232c';
    roundRect(ctx, x, -z - 29, w, 19, 1.5);
    ctx.fill();
    const screen = ctx.createLinearGradient(x, -z - 28, x + w, -z - 11);
    screen.addColorStop(0, '#dbe9ff');
    screen.addColorStop(1, '#9cc0f5');
    ctx.fillStyle = screen;
    ctx.fillRect(x + 1.2, -z - 27.8, w - 2.4, 16.4);
    // What's on screen: a sheet, a chart or a document.
    const r = rng(seed);
    const kind = Math.floor(r() * 3);
    ctx.fillStyle = 'rgba(37,99,235,0.85)';
    ctx.fillRect(x + 1.2, -z - 27.8, w - 2.4, 2.2);
    if (kind === 0) {
      ctx.fillStyle = 'rgba(30,41,59,0.35)';
      for (let i = 0; i < 4; i += 1) ctx.fillRect(x + 3, -z - 23.5 + i * 3, w - 6 - r() * 6, 1);
    } else if (kind === 1) {
      for (let i = 0; i < 5; i += 1) {
        const h = 3 + r() * 8;
        ctx.fillStyle = i === 4 ? '#2563eb' : '#60a5fa';
        ctx.fillRect(x + 3 + i * 3.4, -z - 13 - h, 2.2, h);
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 5, -z - 24.5, w - 10, 12);
      ctx.fillStyle = 'rgba(30,41,59,0.35)';
      for (let i = 0; i < 3; i += 1) ctx.fillRect(x + 7, -z - 22 + i * 3, w - 15, 0.9);
    }
  });
  // Keyboard and mouse.
  box(ctx, { u0: u - 0.24, u1: u + 0.2, v0: v + 0.22, v1: v + 0.36, z0: z, z1: z + 1 }, 0xe6e9ef);
  box(ctx, { u0: u + 0.28, u1: u + 0.34, v0: v + 0.24, v1: v + 0.33, z0: z, z1: z + 1.2 }, 0xe6e9ef);
}

function mug(ctx: Ctx, u: number, v: number, z: number, color: number): void {
  box(ctx, { u0: u - 0.05, u1: u + 0.05, v0: v - 0.05, v1: v + 0.05, z0: z, z1: z + 5 }, color);
  onTop(ctx, z + 5, () => {
    ellipse(ctx, u * T, v * T, 1.4, 1.4, '#5a3a22');
  });
}

function papers(ctx: Ctx, u: number, v: number, z: number, seed: number): void {
  const r = rng(seed);
  onTop(ctx, z + 0.3, () => {
    for (let i = 0; i < 2; i += 1) {
      ctx.save();
      ctx.translate(u * T, v * T);
      ctx.rotate((r() - 0.5) * 0.5);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(-5.5, -4, 11, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -5, 11, 14);
      ctx.fillStyle = 'rgba(30,41,59,0.3)';
      for (let l = 0; l < 4; l += 1) ctx.fillRect(-4.5, -3 + l * 2.6, 8 - r() * 3, 0.6);
      ctx.restore();
    }
  });
}

export function deskPiece(
  edges: Edges,
  opts: { monitor: boolean; accent?: number; wood: number; clutter: number; along: Along; seed: number },
): Piece {
  const key = `desk:${flagsOf(edges)}:${+opts.monitor}:${opts.accent ?? 0}:${opts.wood}:${opts.clutter % 5}:${opts.along.index}/${opts.along.length}:${opts.seed % 7}`;
  return {
    key,
    height: 52,
    draw: (ctx) => {
      const s = span(edges, 0.05);
      // Metal legs at the corners, a modesty panel, then the wooden top.
      const legs: Array<[number, number]> = [];
      if (edges.w && edges.s) legs.push([s.u0 + 0.06, s.v1 - 0.06]);
      if (edges.e && edges.s) legs.push([s.u1 - 0.06, s.v1 - 0.06]);
      if (edges.e && edges.n) legs.push([s.u1 - 0.06, s.v0 + 0.06]);
      if (edges.w && edges.n) legs.push([s.u0 + 0.06, s.v0 + 0.06]);
      box(ctx, { u0: s.u0 + 0.04, u1: s.u1 - 0.04, v0: s.v0 + 0.05, v1: s.v0 + 0.1, z0: 4, z1: 16 }, 0x8f96a3, metal(0x8f96a3), { south: true, east: edges.e });
      for (const [lu, lv] of legs) {
        box(ctx, { u0: lu - 0.03, u1: lu + 0.03, v0: lv - 0.03, v1: lv + 0.03, z0: 0, z1: 16 }, 0x6b7280, metal(0x8a919c));
      }
      const top = wood(opts.wood, opts.seed, opts.along.index * T, opts.along.length * T);
      box(ctx, { ...s, z0: 16, z1: 19 }, top, shade(opts.wood, 0.85), { south: edges.s, east: edges.e });

      if (opts.accent !== undefined) {
        onTop(ctx, 19.2, () => {
          ctx.fillStyle = rgb(opts.accent!, 0.85);
          roundRect(ctx, 0.12 * T, 0.42 * T, 0.76 * T, 0.46 * T, 2);
          ctx.fill();
        });
      }

      if (opts.monitor) {
        monitor(ctx, 0.5, 0.3, 19, opts.seed);
        return;
      }
      switch (opts.clutter % 5) {
        case 0:
          papers(ctx, 0.45, 0.5, 19, opts.seed);
          break;
        case 1:
          mug(ctx, 0.62, 0.45, 19, 0xffffff);
          papers(ctx, 0.3, 0.55, 19, opts.seed);
          break;
        case 2:
          books(ctx, 0.2, 0.6, 0.3, 0.6, 19, opts.seed);
          break;
        case 3:
          smallPlant(ctx, 0.62, 0.4, 19);
          break;
        default:
          break;
      }
    },
  };
}

export function tablePiece(
  edges: Edges,
  opts: { top: number; laptop: boolean; along: Along; seed: number; low?: boolean },
): Piece {
  const z = opts.low ? 10 : 15;
  return {
    key: `table:${flagsOf(edges)}:${opts.top}:${+opts.laptop}:${opts.along.index}/${opts.along.length}:${+!!opts.low}`,
    height: 44,
    draw: (ctx) => {
      if (edges.s && edges.e) {
        box(ctx, { u0: 0.42, u1: 0.56, v0: 0.42, v1: 0.56, z0: 0, z1: z }, 0x6b7280, metal(0x9aa1ad));
      }
      const surface = opts.top === PALETTE.tableTop
        ? matte(opts.top, opts.seed)
        : wood(opts.top, opts.seed, opts.along.index * T, opts.along.length * T);
      box(ctx, { ...span(edges, 0.08), z0: z, z1: z + 3 }, surface, PALETTE.wood, {
        south: edges.s,
        east: edges.e,
      });
      if (opts.laptop) {
        box(ctx, { u0: 0.3, u1: 0.7, v0: 0.42, v1: 0.7, z0: z + 3, z1: z + 4 }, 0xc9ced8, metal(0xb0b6c2));
        onSouth(ctx, 0.43, () => {
          ctx.fillStyle = '#8a93a6';
          roundRect(ctx, 0.3 * T, -z - 17, 0.4 * T, 13, 1);
          ctx.fill();
          ctx.fillStyle = '#bcd6ff';
          ctx.fillRect(0.32 * T, -z - 16, 0.36 * T, 11);
        });
      } else if (opts.low) {
        mug(ctx, 0.4, 0.45, z + 3, 0xf3efe8);
        books(ctx, 0.55, 0.8, 0.35, 0.6, z + 3, opts.seed);
      } else if (edges.n || edges.w) {
        papers(ctx, 0.45, 0.45, z + 3, opts.seed);
      }
    },
  };
}

export function counterPiece(edges: Edges, along: Along): Piece {
  return {
    key: `counter:${flagsOf(edges)}:${along.index}/${along.length}`,
    height: 44,
    draw: (ctx) => {
      const s = span(edges, 0.04);
      const front: Paint = (c, w, h) => {
        wood(PALETTE.counterFront, 3, 0, w)(c, w, h);
        c.fillStyle = 'rgba(255,255,255,0.25)';
        c.fillRect(0, 6, w, 1.5);
      };
      box(ctx, { ...s, z0: 0, z1: 30 }, matte(PALETTE.counterTop, 5), front, { south: edges.s, east: edges.e });
      // Backlit brand strip and the BITE name across the front.
      if (edges.s) {
        onSouth(ctx, s.v1, () => {
          ctx.save();
          ctx.translate(-along.index * T, 0);
          const width = along.length * T;
          ctx.fillStyle = 'rgba(96,165,250,0.85)';
          ctx.fillRect(4, -9, width - 8, 1.6);
          if (along.length >= 3) label(ctx, 'BITE', width / 2, -14, 10, '#fff7ea', 800, 'center');
          ctx.restore();
        });
      }
      if (along.index === 1) {
        monitor(ctx, 0.5, 0.25, 30, 9);
      } else if (along.index === along.length - 2) {
        smallPlant(ctx, 0.5, 0.4, 30);
      }
    },
  };
}

export function shelfPiece(edges: Edges, seed: number, along: Along): Piece {
  return {
    key: `shelf:${flagsOf(edges)}:${seed % 6}:${along.index}`,
    height: 70,
    draw: (ctx) => {
      const s = span(edges, 0.05);
      const height = 62;
      const front: Paint = (c, w, h) => {
        c.fillStyle = rgb(shade(PALETTE.shelf, 0.45));
        c.fillRect(0, 0, w, h);
        const r = rng(seed);
        const rows: Array<[number, number]> = [[4, 18], [22, 37], [41, 56]];
        for (const [top, bottom] of rows) {
          let x = edges.w ? 3 : 0;
          while (x < w - (edges.e ? 3 : 0)) {
            const bw = 2.2 + r() * 2.6;
            const bh = (bottom - top) * (0.65 + r() * 0.35);
            const color = PALETTE.binders[Math.floor(r() * PALETTE.binders.length)];
            const grad = c.createLinearGradient(x, 0, x + bw, 0);
            grad.addColorStop(0, rgb(shade(color, 1.1)));
            grad.addColorStop(1, rgb(shade(color, 0.8)));
            c.fillStyle = grad;
            if (r() > 0.92) {
              c.save();
              c.translate(x, bottom);
              c.rotate(-0.25);
              c.fillRect(0, -bh, bw, bh);
              c.restore();
              x += bw + 2;
            } else {
              c.fillRect(x, bottom - bh, bw, bh);
              c.fillStyle = 'rgba(255,255,255,0.6)';
              c.fillRect(x + 0.5, bottom - bh * 0.6, bw - 1, 1.6);
            }
            x += bw + 0.3;
          }
          // The shelf board.
          c.fillStyle = rgb(PALETTE.shelf);
          c.fillRect(0, bottom, w, 3.5);
          c.fillStyle = 'rgba(255,255,255,0.2)';
          c.fillRect(0, bottom, w, 0.8);
        }
        // Side uprights where the case ends.
        c.fillStyle = rgb(PALETTE.shelf);
        if (edges.w) c.fillRect(0, 0, 3, h);
        if (edges.e) c.fillRect(w - 3, 0, 3, h);
        c.fillRect(0, 0, w, 4);
      };
      box(ctx, { ...s, z0: 0, z1: height }, wood(shade(PALETTE.shelf, 1.05), seed), front, { south: edges.s, east: edges.e });
    },
  };
}

export function serverPiece(): Piece {
  return {
    key: 'server',
    height: 74,
    draw: (ctx) => {
      const front: Paint = (c, w, h) => {
        c.fillStyle = '#2a303c';
        c.fillRect(0, 0, w, h);
        for (let row = 0; row < 8; row += 1) {
          const y = 4 + row * 7.5;
          c.fillStyle = '#3d4555';
          c.fillRect(2, y, w - 4, 6);
          c.fillStyle = 'rgba(0,0,0,0.35)';
          for (let x = 4; x < w - 8; x += 2) c.fillRect(x, y + 1.5, 1, 3);
          c.fillStyle = row % 3 === 0 ? '#fbbf24' : '#34d399';
          c.fillRect(w - 6, y + 2, 1.6, 1.6);
          c.fillStyle = '#34d399';
          c.fillRect(w - 9, y + 2, 1.6, 1.6);
        }
        const glass = c.createLinearGradient(0, 0, w, h);
        glass.addColorStop(0, 'rgba(255,255,255,0.12)');
        glass.addColorStop(0.5, 'rgba(255,255,255,0)');
        c.fillStyle = glass;
        c.fillRect(0, 0, w, h);
      };
      box(ctx, { u0: 0.1, u1: 0.9, v0: 0.12, v1: 0.86, z0: 0, z1: 66 }, 0x3d4558, front);
    },
  };
}

export function sofaPiece(edges: Edges, cushion: boolean): Piece {
  return {
    key: `sofa:${flagsOf(edges)}:${+cushion}`,
    height: 40,
    draw: (ctx) => {
      const s = span(edges, 0.06);
      const fabric: Paint = (c, w, h) => {
        const grad = c.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, rgb(shade(PALETTE.sofa, 1.06)));
        grad.addColorStop(1, rgb(shade(PALETTE.sofa, 0.9)));
        c.fillStyle = grad;
        c.fillRect(0, 0, w, h);
        const r = rng(7);
        for (let i = 0; i < (w * h) / 6; i += 1) {
          c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
          c.fillRect(r() * w, r() * h, 0.7, 0.7);
        }
      };
      box(ctx, { ...s, v0: 0.06, v1: 0.3, z0: 0, z1: 30 }, fabric, fabric, { south: false, east: edges.e });
      box(ctx, { ...s, v0: 0.3, z0: 0, z1: 4 }, 0x5b4636, 0x4a3a2c, { south: edges.s, east: edges.e });
      box(ctx, { ...s, v0: 0.3, z0: 4, z1: 14 }, fabric, fabric, { south: edges.s, east: edges.e });
      // Seat cushion seam.
      onTop(ctx, 14.1, () => {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        if (!edges.e) ctx.fillRect(T - 0.6, 0.32 * T, 1.2, 0.6 * T);
      });
      if (edges.w) box(ctx, { u0: s.u0, u1: s.u0 + 0.15, v0: 0.06, v1: s.v1, z0: 0, z1: 21 }, fabric);
      if (edges.e) box(ctx, { u0: s.u1 - 0.15, u1: s.u1, v0: 0.06, v1: s.v1, z0: 0, z1: 21 }, fabric);
      if (cushion) {
        box(ctx, { u0: 0.3, u1: 0.6, v0: 0.3, v1: 0.4, z0: 14, z1: 26 }, PALETTE.sofaCushion);
      }
    },
  };
}

/** A leafy plant: overlapping, individually shaded leaves around a stem. */
function foliage(ctx: Ctx, cx: number, base: number, height: number, spread: number, seed: number): void {
  const r = rng(seed);
  const leaves = Math.round(height * 0.9);
  ctx.strokeStyle = '#5b4636';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, base);
  ctx.lineTo(cx, base - height * 0.7);
  ctx.stroke();
  for (let i = 0; i < leaves; i += 1) {
    const t = r();
    const y = base - height * (0.25 + t * 0.75);
    const x = cx + (r() - 0.5) * spread * (1.1 - t * 0.5);
    const angle = (x < cx ? -1 : 1) * (0.4 + r() * 0.9) - Math.PI / 2;
    const len = 5 + r() * 6;
    const tone = PALETTE.leaf[Math.floor(r() * 3)];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, -2.5, 0, 2.5);
    grad.addColorStop(0, rgb(shade(tone, 1.2)));
    grad.addColorStop(1, rgb(shade(tone, 0.75)));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, len / 2, 2.4 + r(), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb(shade(tone, 0.6), 0.6);
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.restore();
  }
}

export function plantPiece(seed: number, tall: boolean): Piece {
  const variant = seed % 3;
  return {
    key: `plant:${variant}:${+tall}`,
    height: tall ? 86 : 64,
    draw: (ctx) => {
      ellipse(ctx, 0, 2, 15, 6, 'rgba(15,23,41,0.16)');
      const pot = variant === 1 ? PALETTE.potClay : PALETTE.potWhite;
      box(ctx, { u0: 0.3, u1: 0.7, v0: 0.3, v1: 0.7, z0: 0, z1: tall ? 18 : 15 }, shade(pot, 0.95), pot);
      onTop(ctx, tall ? 18 : 15, () => {
        ctx.fillStyle = '#4a3729';
        ctx.fillRect(0.33 * T, 0.33 * T, 0.34 * T, 0.34 * T);
      });
      foliage(ctx, 0, -(tall ? 18 : 15) - 2, tall ? 64 : 40, tall ? 30 : 26, seed + variant * 17);
    },
  };
}

/**
 * A freestanding whiteboard, notice board or screen. It stands along the
 * object's long axis and faces the camera's side of the room; its content is
 * painted once across the whole board and each tile shows its share.
 */
export function panelPiece(
  edges: Edges,
  opts: { axis: 'x' | 'y'; screen: boolean; along: Along; lines: string[]; cork?: boolean },
): Piece {
  const along = opts.axis === 'x';
  return {
    key: `panel:${opts.axis}:${flagsOf(edges)}:${+opts.screen}:${+!!opts.cork}:${opts.along.index}/${opts.along.length}:${opts.lines.join('|')}`,
    height: 70,
    draw: (ctx) => {
      const width = opts.along.length * T;
      const z0 = opts.screen ? 22 : 16;
      const z1 = opts.screen ? 56 : 62;
      const paint = () => {
        ctx.save();
        // Face space runs the other way along y, so mirror the index there.
        const index = along ? opts.along.index : opts.along.length - 1 - opts.along.index;
        ctx.beginPath();
        ctx.rect(-1, -80, T + 2, 80);
        ctx.clip();
        ctx.translate(-index * T, 0);
        const x0 = 2;
        const x1 = width - 2;
        // Stand.
        ctx.fillStyle = '#7d8594';
        ctx.fillRect(x0 + 4, -z0, 1.8, z0);
        ctx.fillRect(x1 - 6, -z0, 1.8, z0);
        ctx.fillRect(x0 + 1, -1.5, 8, 1.5);
        ctx.fillRect(x1 - 9, -1.5, 8, 1.5);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x0 + 1, -z1 + 1.5, x1 - x0, z1 - z0);
        if (opts.screen) {
          ctx.fillStyle = '#1b1f27';
          roundRect(ctx, x0, -z1, x1 - x0, z1 - z0, 2);
          ctx.fill();
          const glow = ctx.createLinearGradient(x0, -z1, x1, -z0);
          glow.addColorStop(0, '#1e3a8a');
          glow.addColorStop(1, '#2563eb');
          ctx.fillStyle = glow;
          ctx.fillRect(x0 + 2, -z1 + 2, x1 - x0 - 4, z1 - z0 - 4);
          const [title, sub] = opts.lines;
          if (title) label(ctx, title, x0 + 6, -z1 + 12, 7, '#ffffff', 700);
          if (sub) label(ctx, sub, x0 + 6, -z1 + 20, 5.5, '#bfdbfe', 500);
          for (let i = 0; i < 6; i += 1) {
            const h = 4 + ((i * 37) % 9);
            ctx.fillStyle = i === 5 ? '#fbbf24' : '#93c5fd';
            ctx.fillRect(x1 - 30 + i * 4, -z0 - 4 - h, 2.6, h);
          }
        } else {
          ctx.fillStyle = '#9aa3b2';
          ctx.fillRect(x0 - 1, -z1 - 1, x1 - x0 + 2, z1 - z0 + 2);
          ctx.fillStyle = opts.cork ? '#d9b07a' : '#fdfdfb';
          ctx.fillRect(x0 + 1, -z1 + 1, x1 - x0 - 2, z1 - z0 - 2);
          const [title, ...points] = opts.lines;
          if (opts.cork) {
            points.concat(title ? [title] : []).forEach((line, i) => {
              const px = x0 + 5 + (i % 3) * ((x1 - x0 - 8) / 3);
              const py = -z1 + 6 + Math.floor(i / 3) * 20;
              ctx.fillStyle = ['#fff7c2', '#ffffff', '#d7f0ff', '#ffe0e0'][i % 4];
              ctx.fillRect(px, py, (x1 - x0) / 3 - 6, 17);
              ellipse(ctx, px + 6, py + 1.5, 1.2, 1.2, '#d9483b');
              label(ctx, line.slice(0, 14), px + 2, py + 8, 4.2, '#334155', 600);
            });
          } else {
            if (title) label(ctx, title, x0 + 5, -z1 + 11, 7, '#0f1729', 700);
            points.forEach((line, i) =>
              label(ctx, `${i + 1}. ${line}`, x0 + 7, -z1 + 20 + i * 7, 5, '#1d4ed8', 600),
            );
            const bars = [6, 10, 8, 15];
            bars.forEach((h, i) => {
              ctx.fillStyle = i === 3 ? '#2563eb' : '#60a5fa';
              ctx.fillRect(x1 - 26 + i * 5, -z0 - 5 - h, 3.2, h);
            });
            ctx.strokeStyle = '#d9483b';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(x1 - 27, -z0 - 10);
            ctx.lineTo(x1 - 17, -z0 - 16);
            ctx.lineTo(x1 - 7, -z0 - 22);
            ctx.stroke();
            // Marker tray.
            ctx.fillStyle = '#9aa3b2';
            ctx.fillRect(x0 + 6, -z0, 20, 1.6);
            ctx.fillStyle = '#2563eb';
            ctx.fillRect(x0 + 9, -z0 - 1, 4, 1);
            ctx.fillStyle = '#d9483b';
            ctx.fillRect(x0 + 15, -z0 - 1, 4, 1);
          }
        }
        ctx.restore();
      };
      if (along) onSouth(ctx, 0.25, paint);
      else onEast(ctx, 0.25, paint);
    },
  };
}

export function bookcasePiece(edges: Edges, seed: number, along: Along): Piece {
  return {
    key: `bookcase:${flagsOf(edges)}:${seed % 5}:${along.index}`,
    height: 84,
    draw: (ctx) => {
      const s = span(edges, 0.06);
      const front: Paint = (c, w, h) => {
        wood(PALETTE.walnut, seed)(c, w, h);
        const r = rng(seed);
        for (let row = 0; row < 4; row += 1) {
          const top = 4 + row * 18;
          c.fillStyle = 'rgba(20,14,10,0.55)';
          c.fillRect(edges.w ? 3 : 0, top, w - (edges.w ? 3 : 0) - (edges.e ? 3 : 0), 15);
          let x = edges.w ? 4 : 1;
          while (x < w - 6) {
            if (r() > 0.82) {
              // An ornament instead of a book.
              ellipse(c, x + 3, top + 11, 2.6, 3.6, r() > 0.5 ? '#e5e7eb' : '#d9a23a');
              x += 7;
              continue;
            }
            const bw = 1.8 + r() * 2;
            const bh = 9 + r() * 5;
            c.fillStyle = rgb(PALETTE.binders[Math.floor(r() * PALETTE.binders.length)]);
            c.fillRect(x, top + 15 - bh, bw, bh);
            x += bw + 0.4;
          }
        }
      };
      box(ctx, { ...s, z0: 0, z1: 76 }, wood(PALETTE.walnut, seed), front, { south: edges.s, east: edges.e });
    },
  };
}

export function cabinetPiece(seed: number): Piece {
  return {
    key: `cabinet:${seed % 2}`,
    height: 56,
    draw: (ctx) => {
      const body = seed % 2 ? 0xc3c8d0 : 0x9ea6b3;
      const front: Paint = (c, w, h) => {
        metal(body)(c, w, h);
        for (let i = 0; i < 3; i += 1) {
          const y = 2 + i * ((h - 4) / 3);
          c.strokeStyle = 'rgba(0,0,0,0.25)';
          c.lineWidth = 0.6;
          c.strokeRect(2, y, w - 4, (h - 4) / 3 - 1.5);
          c.fillStyle = '#e5e7eb';
          c.fillRect(w / 2 - 3, y + 3, 6, 1.6);
          c.fillStyle = '#ffffff';
          c.fillRect(w / 2 - 2.5, y + 6, 5, 2.2);
        }
      };
      box(ctx, { u0: 0.14, u1: 0.86, v0: 0.18, v1: 0.82, z0: 0, z1: 44 }, metal(shade(body, 1.08)), front);
      box(ctx, { u0: 0.3, u1: 0.62, v0: 0.3, v1: 0.6, z0: 44, z1: 50 }, 0xb98a5e);
    },
  };
}

export function coffeePiece(edges: Edges, along: Along): Piece {
  return {
    key: `coffee:${flagsOf(edges)}:${along.index}`,
    height: 70,
    draw: (ctx) => {
      const s = span(edges, 0.05);
      box(ctx, { ...s, z0: 0, z1: 26 }, wood(PALETTE.wood, 21, along.index * T, along.length * T), matte(0x2f3442, 4), { south: edges.s, east: edges.e });
      if (along.index === 0) {
        // Espresso machine.
        box(ctx, { u0: 0.18, u1: 0.78, v0: 0.2, v1: 0.6, z0: 26, z1: 54 }, metal(0xb6bcc6), metal(0xd1d5db));
        onSouth(ctx, 0.6, () => {
          ctx.fillStyle = '#1f2937';
          ctx.fillRect(0.28 * T, -50, 0.4 * T, 7);
          ctx.fillStyle = '#34d399';
          ctx.fillRect(0.32 * T, -48, 2, 2);
          ctx.fillStyle = '#374151';
          ctx.fillRect(0.4 * T, -40, 0.18 * T, 5);
        });
        mug(ctx, 0.48, 0.72, 26, 0xffffff);
      } else {
        for (let i = 0; i < 3; i += 1) mug(ctx, 0.25 + i * 0.18, 0.45, 26, [0xffffff, 0xf3d9b1, 0xd7e7fb][i]);
        box(ctx, { u0: 0.3, u1: 0.7, v0: 0.62, v1: 0.82, z0: 26, z1: 30 }, 0xc4825a);
      }
    },
  };
}

export function waterPiece(): Piece {
  return {
    key: 'water',
    height: 72,
    draw: (ctx) => {
      box(ctx, { u0: 0.28, u1: 0.72, v0: 0.28, v1: 0.72, z0: 0, z1: 40 }, 0xf3f4f6, matte(0xe5e7eb, 2));
      onSouth(ctx, 0.72, () => {
        ctx.fillStyle = '#9ca3af';
        ctx.fillRect(0.38 * T, -30, 0.24 * T, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0.4 * T, -28, 2, 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0.54 * T, -28, 2, 2);
      });
      const top = pt(0.5, 0.5, 40);
      const bottle = ctx.createLinearGradient(top.x - 7, 0, top.x + 7, 0);
      bottle.addColorStop(0, 'rgba(147,197,253,0.75)');
      bottle.addColorStop(0.4, 'rgba(219,234,254,0.85)');
      bottle.addColorStop(1, 'rgba(96,165,250,0.75)');
      ctx.fillStyle = bottle;
      roundRect(ctx, top.x - 7, top.y - 24, 14, 22, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(37,99,235,0.35)';
      ctx.fillRect(top.x - 7, top.y - 12, 14, 9);
    },
  };
}

export function coatrackPiece(): Piece {
  return {
    key: 'coatrack',
    height: 76,
    draw: (ctx) => {
      const base = pt(0.5, 0.5, 0);
      ellipse(ctx, base.x, base.y, 9, 4, '#3a2a1f');
      ctx.fillStyle = '#5b4636';
      ctx.fillRect(base.x - 1.2, base.y - 66, 2.4, 66);
      ctx.fillStyle = '#1f2937';
      roundRect(ctx, base.x - 9, base.y - 62, 9, 30, 3);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      roundRect(ctx, base.x + 1, base.y - 60, 8, 24, 3);
      ctx.fill();
      ellipse(ctx, base.x, base.y - 67, 5, 2.4, '#5b4636');
    },
  };
}

export function boxesPiece(seed: number): Piece {
  return {
    key: `boxes:${seed % 3}`,
    height: 56,
    draw: (ctx) => {
      const cardboard = (c: Ctx, w: number, h: number) => {
        c.fillStyle = '#c99a62';
        c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(255,255,255,0.15)';
        c.fillRect(w / 2 - 1.5, 0, 3, h);
        c.fillStyle = 'rgba(80,50,20,0.25)';
        c.fillRect(0, 0, w, 0.8);
      };
      box(ctx, { u0: 0.1, u1: 0.85, v0: 0.15, v1: 0.85, z0: 0, z1: 18 }, cardboard, cardboard);
      box(ctx, { u0: 0.18, u1: 0.72, v0: 0.22, v1: 0.72, z0: 18, z1: 32 }, cardboard, cardboard);
      if (seed % 3 !== 0) {
        box(ctx, { u0: 0.3, u1: 0.62, v0: 0.32, v1: 0.6, z0: 32, z1: 42 }, cardboard, cardboard);
      }
      onSouth(ctx, 0.85, () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0.2 * T, -12, 7, 5);
        label(ctx, 'BITE', 0.22 * T, -8.2, 3.6, '#c2410c', 800);
      });
    },
  };
}

export function lampPiece(): Piece {
  return {
    key: 'lamp',
    height: 90,
    draw: (ctx) => {
      const base = pt(0.5, 0.5, 0);
      // Warm pool of light on the floor.
      const pool = ctx.createRadialGradient(base.x, base.y, 2, base.x, base.y, 30);
      pool.addColorStop(0, 'rgba(255,214,140,0.35)');
      pool.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, 30, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ellipse(ctx, base.x, base.y, 7, 3, '#2b303b');
      ctx.fillStyle = '#2b303b';
      ctx.fillRect(base.x - 0.9, base.y - 62, 1.8, 62);
      const shadeGrad = ctx.createLinearGradient(base.x - 10, 0, base.x + 10, 0);
      shadeGrad.addColorStop(0, '#fff3d6');
      shadeGrad.addColorStop(1, '#e8cf9e');
      ctx.fillStyle = shadeGrad;
      ctx.beginPath();
      ctx.moveTo(base.x - 6, base.y - 76);
      ctx.lineTo(base.x + 6, base.y - 76);
      ctx.lineTo(base.x + 10, base.y - 60);
      ctx.lineTo(base.x - 10, base.y - 60);
      ctx.fill();
      const glow = ctx.createRadialGradient(base.x, base.y - 62, 1, base.x, base.y - 62, 22);
      glow.addColorStop(0, 'rgba(255,226,160,0.55)');
      glow.addColorStop(1, 'rgba(255,226,160,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(base.x - 24, base.y - 86, 48, 48);
    },
  };
}

export function printerPiece(): Piece {
  return {
    key: 'printer',
    height: 52,
    draw: (ctx) => {
      box(ctx, { u0: 0.12, u1: 0.88, v0: 0.16, v1: 0.84, z0: 0, z1: 34 }, matte(0xe5e7eb, 6), (c, w, h) => {
        matte(0xd1d5db, 6)(c, w, h);
        c.fillStyle = 'rgba(0,0,0,0.2)';
        c.fillRect(2, h * 0.45, w - 4, 0.8);
        c.fillRect(2, h * 0.75, w - 4, 0.8);
      });
      box(ctx, { u0: 0.2, u1: 0.8, v0: 0.2, v1: 0.5, z0: 34, z1: 40 }, 0x9ca3af);
      onTop(ctx, 34.2, () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0.3 * T, 0.55 * T, 0.4 * T, 0.25 * T);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0.66 * T, 0.22 * T, 0.12 * T, 0.12 * T);
      });
    },
  };
}

// ---------------------------------------------------------------- characters

export type View = 'front' | 'back' | 'side';

const OUTLINE = 'rgba(28,24,32,0.55)';

function part(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, color: number, outline = true): void {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, rgb(shade(color, 1.12)));
  grad.addColorStop(1, rgb(shade(color, 0.86)));
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
}

function head(ctx: Ctx, look: Look, view: View, cy: number): void {
  const turn = view === 'side' ? 2.2 : 0;
  // Neck.
  ctx.fillStyle = rgb(shade(look.skin, 0.88));
  ctx.fillRect(-2.5, cy + 6, 5, 4);
  // Hair behind the head (long hair falls to the shoulders).
  if (look.long) part(ctx, -9.5, cy - 9, 19, view === 'back' ? 22 : 19, 7, look.hair);
  // Face.
  part(ctx, -8, cy - 8.5, 16, 16.5, 7, look.skin);
  if (view !== 'back') {
    // Ear.
    ellipse(ctx, view === 'side' ? -7 : -8, cy + 0.5, 1.8, 2.4, rgb(shade(look.skin, 0.92)));
    if (view === 'front') ellipse(ctx, 8, cy + 0.5, 1.8, 2.4, rgb(shade(look.skin, 0.92)));
    // Eyes with a glint, brows, cheeks, mouth.
    for (const ex of view === 'side' ? [-0.5, 5] : [-3.2, 3.2]) {
      ellipse(ctx, ex + turn * 0.4, cy + 1.2, 1.25, 1.7, '#231c1a');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex + turn * 0.4 - 0.6, cy + 0.1, 0.7, 0.7);
      ctx.fillStyle = rgb(shade(look.hair, 0.9));
      ctx.fillRect(ex + turn * 0.4 - 1.6, cy - 2.2, 3.2, 0.8);
    }
    ellipse(ctx, -4.5 + turn, cy + 4, 1.6, 0.9, 'rgba(240,128,128,0.35)');
    ellipse(ctx, 4.5 + turn, cy + 4, 1.6, 0.9, 'rgba(240,128,128,0.35)');
    ctx.strokeStyle = rgb(shade(look.skin, 0.6));
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(turn, cy + 4.6, 1.4, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // Hair.
  const hairGrad = ctx.createLinearGradient(0, cy - 11, 0, cy + 4);
  hairGrad.addColorStop(0, rgb(shade(look.hair, 1.25)));
  hairGrad.addColorStop(1, rgb(shade(look.hair, 0.85)));
  ctx.fillStyle = hairGrad;
  ctx.beginPath();
  if (view === 'back') {
    ctx.roundRect(-9, cy - 11, 18, look.long ? 22 : 17, 8);
  } else {
    ctx.moveTo(-9, cy + 2);
    ctx.quadraticCurveTo(-10, cy - 11, 0, cy - 11);
    ctx.quadraticCurveTo(10, cy - 11, 9, cy + 2);
    ctx.lineTo(7.5, cy - 3);
    ctx.quadraticCurveTo(2 + turn, cy - 6, -1 + turn, cy - 2.5);
    ctx.quadraticCurveTo(-4, cy - 5, -7.5, cy - 2.5);
    ctx.closePath();
  }
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-1, cy - 4, 6, -2.6, -1.9);
  ctx.stroke();
}

function torso(ctx: Ctx, look: Look, view: View, top: number, bottom: number): void {
  const body = look.jacket ?? look.shirt;
  part(ctx, -8.5, top, 17, bottom - top, 4.5, body);
  if (view === 'back') {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(-0.3, top + 4, 0.6, bottom - top - 5);
    ctx.fillStyle = rgb(look.shirt);
    ctx.fillRect(-3.5, top, 7, 1.6);
    return;
  }
  const cx = view === 'side' ? 2 : 0;
  // Collar, lapels, tie.
  ctx.fillStyle = rgb(look.shirt);
  ctx.beginPath();
  ctx.moveTo(cx - 4, top);
  ctx.lineTo(cx + 4, top);
  ctx.lineTo(cx, top + (look.jacket !== undefined ? 9 : 4));
  ctx.closePath();
  ctx.fill();
  if (look.tie !== undefined) {
    ctx.fillStyle = rgb(look.tie);
    ctx.beginPath();
    ctx.moveTo(cx - 1, top + 1.5);
    ctx.lineTo(cx + 1, top + 1.5);
    ctx.lineTo(cx + 1.4, top + 9);
    ctx.lineTo(cx, top + 10.5);
    ctx.lineTo(cx - 1.4, top + 9);
    ctx.closePath();
    ctx.fill();
  }
  if (look.jacket !== undefined) {
    ctx.strokeStyle = rgb(shade(look.jacket, 0.65));
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - 4.5, top + 0.5);
    ctx.lineTo(cx - 0.6, top + 10);
    ctx.moveTo(cx + 4.5, top + 0.5);
    ctx.lineTo(cx + 0.6, top + 10);
    ctx.stroke();
    ellipse(ctx, cx, top + 12.5, 0.7, 0.7, rgb(shade(look.jacket, 0.6)));
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(cx - 0.3, top + 4, 0.6, bottom - top - 5);
  }
}

/**
 * A person, feet at the origin (standing) or hips at the origin (sitting).
 * `frame` steps a four-frame walk cycle; `view` is mirrored by the caller for
 * the left-facing side view.
 */
export function drawPerson(
  ctx: Ctx,
  look: Look,
  view: View,
  frame = 0,
  pose: 'stand' | 'sit' = 'stand',
): void {
  const swing = [0, 2.2, 0, -2.2][frame % 4];
  const body = look.jacket ?? look.shirt;

  if (pose === 'sit') {
    if (view !== 'back') {
      // Thighs forward, shins down.
      part(ctx, -6.5, -2, 5.5, 8, 2.5, look.pants);
      part(ctx, 1, -2, 5.5, 8, 2.5, look.pants);
      part(ctx, -6, 5, 4.5, 9, 2, shade(look.pants, 0.9));
      part(ctx, 1.5, 5, 4.5, 9, 2, shade(look.pants, 0.9));
      ellipse(ctx, -3.8, 14, 3.2, 1.6, '#1b1f29');
      ellipse(ctx, 3.8, 14, 3.2, 1.6, '#1b1f29');
    }
    torso(ctx, look, view, -18, 1);
    // Arms reaching forward to the desk.
    part(ctx, -11, -16.5, 4.2, 12, 2, shade(body, 0.9));
    part(ctx, 6.8, -16.5, 4.2, 12, 2, shade(body, 0.9));
    if (view !== 'back') {
      ellipse(ctx, -9, -4.5, 2, 2, rgb(look.skin));
      ellipse(ctx, 9, -4.5, 2, 2, rgb(look.skin));
    }
    head(ctx, look, view, -27);
    return;
  }

  ellipse(ctx, 0, 0, 12, 4.5, 'rgba(15,23,41,0.25)');

  // Legs and shoes.
  const lift = (s: number) => Math.max(0, s);
  part(ctx, -6, -19 + lift(swing), 5.2, 18 - lift(swing), 2, look.pants);
  part(ctx, 0.8, -19 + lift(-swing), 5.2, 18 - lift(-swing), 2, shade(look.pants, 0.92));
  ellipse(ctx, -3.4, -1.2 + lift(swing) * -0.2, 3.6, 2, '#1b1f29');
  ellipse(ctx, 3.4, -1.2 + lift(-swing) * -0.2, 3.6, 2, '#1b1f29');
  ellipse(ctx, -4.4, -2, 1.2, 0.5, 'rgba(255,255,255,0.3)');

  // Back arm, torso, belt, front arm.
  const armL = view === 'side' ? 0 : swing;
  part(ctx, -11.5, -35 + armL, 4.4, 16, 2.2, shade(body, 0.85));
  torso(ctx, look, view, -37, -17);
  ctx.fillStyle = '#2b2f38';
  ctx.fillRect(-8.3, -19.5, 16.6, 2);
  ctx.fillStyle = '#c9a85b';
  ctx.fillRect(-1.2, -19.5, 2.4, 2);
  part(ctx, 7.1, -35 - armL, 4.4, 16, 2.2, shade(body, 0.92));
  if (view !== 'back') {
    ellipse(ctx, -9.3, -18.5 + armL, 2.2, 2.2, rgb(look.skin));
    ellipse(ctx, 9.3, -18.5 - armL, 2.2, 2.2, rgb(look.skin));
  }

  head(ctx, look, view, -46);
}

export function chairPiece(
  facing: Facing,
  occupant: { look: Look } | undefined,
  seed: number,
): Piece {
  return {
    key: `chair:${facing}:${occupant ? `${occupant.look.shirt}-${occupant.look.hair}-${+!!occupant.look.long}` : 'empty'}:${seed % 2}`,
    height: 70,
    draw: (ctx) => {
      const base = pt(0.5, 0.5, 0);
      ellipse(ctx, base.x, base.y, 13, 5.5, 'rgba(15,23,41,0.2)');
      // Five-star base and gas lift.
      ctx.strokeStyle = '#2a2f3a';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.moveTo(base.x, base.y - 3);
        ctx.lineTo(base.x + Math.cos(a) * 9, base.y - 1.5 + Math.sin(a) * 4);
        ctx.stroke();
      }
      ctx.fillStyle = '#4b5563';
      ctx.fillRect(base.x - 1.2, base.y - 12, 2.4, 10);

      const backrest: Box = {
        n: { u0: 0.24, u1: 0.76, v0: 0.7, v1: 0.8, z0: 15, z1: 40 },
        s: { u0: 0.24, u1: 0.76, v0: 0.2, v1: 0.3, z0: 15, z1: 40 },
        e: { u0: 0.2, u1: 0.3, v0: 0.24, v1: 0.76, z0: 15, z1: 40 },
        w: { u0: 0.7, u1: 0.8, v0: 0.24, v1: 0.76, z0: 15, z1: 40 },
      }[facing];
      // A backrest on the camera's side covers the sitter; one on the far side
      // is covered by them.
      const backInFront = facing === 'n' || facing === 'w';
      const mesh: Paint = (c, w, h) => {
        c.fillStyle = '#262b35';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,0.07)';
        c.lineWidth = 0.4;
        for (let x = 0; x < w; x += 1.6) {
          c.beginPath();
          c.moveTo(x, 0);
          c.lineTo(x, h);
          c.stroke();
        }
      };

      box(ctx, { u0: 0.24, u1: 0.76, v0: 0.24, v1: 0.76, z0: 11, z1: 15 }, 0x3a404c, 0x2a2f3a);
      if (!backInFront) box(ctx, backrest, 0x3a404c, mesh);
      if (occupant) {
        const seat = pt(0.5, 0.5, 15);
        ctx.save();
        ctx.translate(seat.x, seat.y);
        const view: View = facing === 'n' || facing === 'w' ? 'back' : 'side';
        if (facing === 's' || facing === 'w') ctx.scale(-1, 1);
        drawPerson(ctx, occupant.look, view, 0, 'sit');
        ctx.restore();
      }
      if (backInFront) box(ctx, backrest, 0x3a404c, mesh);
    },
  };
}

// --------------------------------------------------------------------- signs

export type SignIcon = 'person' | 'folder' | 'chat' | 'desk' | 'bell' | 'chart' | 'star';

/** Small white glyphs for the room signs, drawn at (0, 0) in a 14px box. */
export function drawSignIcon(g: Phaser.GameObjects.Graphics, icon: SignIcon): void {
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
