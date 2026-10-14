import { drawPerson, type Look } from '@/game/office/art';

/**
 * The X-PASS Discover lobby that greets a new account on `/start`.
 *
 * A one-point perspective of the ground floor — ceiling lights, the reception
 * desk in front of the logo wall, lifts and security gates, sofas and plants
 * on a polished floor that mirrors the lights — seen from just behind the new
 * hire on their first morning. It is laid out in a fixed `LOBBY_W` × `LOBBY_H`
 * frame; the caller scales the context so it is painted at full screen
 * resolution.
 *
 * Everything is placed in metres: x to the right, y up, z towards the viewer
 * (the camera is at z = 0 looking down −z), and projected by `P`.
 */

export const LOBBY_W = 576;
export const LOBBY_H = 384;

const CX = LOBBY_W / 2;
const CY = 170;
const FOCAL = 300;
const EYE = 1.7;

type V = { x: number; y: number };
type Ctx = CanvasRenderingContext2D;

const P = (x: number, y: number, z: number): V => ({
  x: CX + (FOCAL * x) / -z,
  y: CY - (FOCAL * (y - EYE)) / -z,
});

/** Screen pixels per metre at depth z. */
const scaleAt = (z: number) => FOCAL / -z;

const ROOM = { x0: -7, x1: 7, ceiling: 4.6, back: -13, front: -0.5 };

/** What the lobby's signage says: the name behind reception, and the directory. */
export type LobbySignage = {
  directoryTitle: [string, string];
  directory: string[];
};

let signage: LobbySignage = { directoryTitle: ['', ''], directory: [] };

/** The X-PASS mark: two crossed strokes, drawn in a `size`-pixel box at (x, y). */
function xMark(ctx: Ctx, x: number, y: number, size: number, color: string): void {
  const k = size / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(22, 22);
  ctx.lineTo(0, 44);
  ctx.lineTo(10, 44);
  ctx.lineTo(27, 27);
  ctx.lineTo(44, 44);
  ctx.lineTo(54, 44);
  ctx.lineTo(32, 22);
  ctx.lineTo(54, 0);
  ctx.lineTo(44, 0);
  ctx.lineTo(27, 17);
  ctx.lineTo(10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function poly(ctx: Ctx, points: V[], fill: string | CanvasGradient | CanvasPattern): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

function line(ctx: Ctx, a: V, b: V, stroke: string, width = 1): void {
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

/**
 * Maps a flat drawing onto a wall plane. `o`, `a`, `b` are the projected
 * origin, +X end and +Y end of a `w` × `h` panel; within a panel this small
 * the affine stretch is indistinguishable from true perspective.
 */
function onPanel(ctx: Ctx, o: V, a: V, b: V, w: number, h: number, draw: () => void): void {
  ctx.save();
  ctx.transform((a.x - o.x) / w, (a.y - o.y) / w, (b.x - o.x) / h, (b.y - o.y) / h, o.x, o.y);
  draw();
  ctx.restore();
}

type Faces = { top: string; front: string; side: string };

/**
 * An axis-aligned box. The camera sees its front, its top when below eye
 * level, and whichever side faces the middle of the picture.
 */
function box(
  ctx: Ctx,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  faces: Faces,
): void {
  if (x0 > 0) poly(ctx, [P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1), P(x0, y0, z0)], faces.side);
  if (x1 < 0) poly(ctx, [P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1), P(x1, y0, z0)], faces.side);
  if (y1 < EYE) poly(ctx, [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], faces.top);
  if (y0 > EYE) poly(ctx, [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], faces.top);
  poly(ctx, [P(x0, y1, z1), P(x1, y1, z1), P(x1, y0, z1), P(x0, y0, z1)], faces.front);
}

function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --------------------------------------------------------------- the room

function ceiling(ctx: Ctx): void {
  const { x0, x1, ceiling: y, back, front } = ROOM;
  const grad = ctx.createLinearGradient(0, 0, 0, P(0, y, back).y);
  grad.addColorStop(0, '#e9dfcd');
  grad.addColorStop(1, '#d6c8b0');
  poly(ctx, [P(x0, y, front), P(x1, y, front), P(x1, y, back), P(x0, y, back)], grad);
  // Ceiling tile grid.
  for (let x = -7; x <= 7; x += 1.4) line(ctx, P(x, y, front), P(x, y, back), 'rgba(120,100,70,0.18)');
  for (let z = -1.4; z > back; z -= 1.4) line(ctx, P(x0, y, z), P(x1, y, z), 'rgba(120,100,70,0.18)');
  // Recessed light panels, each with a soft halo.
  for (const z of [-1.6, -3.6, -6, -8.6, -11.4]) {
    for (const [a, b] of [[-5, -2.2], [2.2, 5]] as const) {
      const depth = 0.5;
      const halo = [P(a - 0.4, y, z + 0.3), P(b + 0.4, y, z + 0.3), P(b + 0.4, y, z - depth - 0.3), P(a - 0.4, y, z - depth - 0.3)];
      poly(ctx, halo, 'rgba(255,236,190,0.35)');
      poly(ctx, [P(a, y, z), P(b, y, z), P(b, y, z - depth), P(a, y, z - depth)], '#fffaf0');
    }
  }
}

function skyline(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number): void {
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#f5c99b');
  sky.addColorStop(0.5, '#cfd9e6');
  sky.addColorStop(1, '#a9bcd2');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  const r = rng(seed);
  for (const [color, minH, maxH] of [
    ['#9fb2c8', 0.35, 0.8],
    ['#6f86a3', 0.2, 0.6],
  ] as const) {
    let bx = x - 2;
    while (bx < x + w) {
      const bw = 4 + r() * 9;
      const bh = h * (minH + r() * (maxH - minH));
      ctx.fillStyle = color;
      ctx.fillRect(bx, y + h - bh, bw, bh);
      if (color === '#6f86a3') {
        for (let wy = y + h - bh + 2; wy < y + h - 2; wy += 3) {
          for (let wx = bx + 1; wx < bx + bw - 1; wx += 2) {
            if (r() > 0.6) {
              ctx.fillStyle = 'rgba(255,230,170,0.85)';
              ctx.fillRect(wx, wy, 1, 1);
            }
          }
        }
      }
      bx += bw + r() * 2;
    }
  }
}

function backWall(ctx: Ctx): void {
  const { x0, x1, ceiling: top, back: z } = ROOM;
  poly(ctx, [P(x0, top, z), P(x1, top, z), P(x1, 0, z), P(x0, 0, z)], '#efe9de');

  // City windows on the left of the back wall.
  const o = P(-6.8, 3.6, z);
  const a = P(-3.4, 3.6, z);
  const b = P(-6.8, 0, z);
  onPanel(ctx, o, a, b, 100, 100, () => {
    skyline(ctx, 0, 0, 100, 100, 11);
    ctx.fillStyle = '#4a5366';
    for (const mx of [0, 33, 66, 98]) ctx.fillRect(mx, 0, 2, 100);
    ctx.fillRect(0, 0, 100, 2);
    ctx.fillRect(0, 62, 100, 2);
  });

  // Two lifts on the right of the back wall, with floor indicators.
  for (const [ex, label] of [[3.5, '1'], [5.3, '2']] as const) {
    const eo = P(ex, 3.1, z);
    const ea = P(ex + 1.4, 3.1, z);
    const eb = P(ex, 0, z);
    onPanel(ctx, eo, ea, eb, 140, 310, () => {
      ctx.fillStyle = '#5b6170';
      ctx.fillRect(0, 40, 140, 270);
      const steel = ctx.createLinearGradient(10, 0, 130, 0);
      steel.addColorStop(0, '#c9ced6');
      steel.addColorStop(0.5, '#eef0f3');
      steel.addColorStop(1, '#b4bac4');
      ctx.fillStyle = steel;
      ctx.fillRect(10, 52, 120, 258);
      ctx.fillStyle = 'rgba(40,46,58,0.6)';
      ctx.fillRect(69, 52, 2, 258);
      ctx.fillStyle = '#1d2129';
      ctx.fillRect(45, 4, 50, 26);
      ctx.font = '700 20px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffb547';
      ctx.fillText(label, 70, 24);
    });
    // Call button.
    const cb = P(ex + 1.55, 1.3, z);
    poly(ctx, [cb, { x: cb.x + 3, y: cb.y }, { x: cb.x + 3, y: cb.y + 7 }, { x: cb.x, y: cb.y + 7 }], '#2b303b');
    poly(ctx, [{ x: cb.x + 1, y: cb.y + 2 }, { x: cb.x + 2, y: cb.y + 2 }, { x: cb.x + 2, y: cb.y + 3 }, { x: cb.x + 1, y: cb.y + 3 }], '#60a5fa');
  }
  // Skirting.
  poly(ctx, [P(x0, 0.12, z), P(x1, 0.12, z), P(x1, 0, z), P(x0, 0, z)], '#8c6a4c');
}

function sideWalls(ctx: Ctx): void {
  const { x0, x1, ceiling: top, back, front } = ROOM;

  // Left: a white feature panel near us, glazing further back.
  poly(ctx, [P(x0, top, front), P(x0, top, back), P(x0, 0, back), P(x0, 0, front)], '#e7e1d6');
  const glassFrom = -10.8;
  onPanel(ctx, P(x0, 3.8, glassFrom), P(x0, 3.8, back), P(x0, 0, glassFrom), 300, 100, () => {
    skyline(ctx, 0, 0, 300, 100, 5);
    ctx.fillStyle = 'rgba(190,220,255,0.25)';
    ctx.fillRect(0, 0, 300, 100);
    ctx.fillStyle = '#4a5366';
    for (let x = 0; x <= 300; x += 37) ctx.fillRect(x, 0, 3, 100);
    ctx.fillRect(0, 0, 300, 3);
  });
  onPanel(ctx, P(x0, 3.4, -7.4), P(x0, 3.4, -10.6), P(x0, 0.6, -7.4), 200, 140, () => {
    ctx.fillStyle = '#fbf9f5';
    ctx.fillRect(0, 0, 200, 140);
    xMark(ctx, 40, 30, 64, '#2563eb');
    ctx.font = '700 22px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1d2433';
    ctx.fillText('X-PASS', 100, 52);
    ctx.font = '500 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('Discover', 100, 72);
    ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#3c4759';
    ctx.fillText("Today's experience", 40, 100);
    ctx.fillText("becomes tomorrow's possibility.", 40, 114);
    ctx.fillStyle = '#e0a84a';
    ctx.fillRect(40, 124, 24, 3);
  });

  // Right: glazing at the back, a directory pillar near us.
  poly(ctx, [P(x1, top, front), P(x1, top, back), P(x1, 0, back), P(x1, 0, front)], '#ece6db');
  onPanel(ctx, P(x1, 3.8, back), P(x1, 3.8, -10.8), P(x1, 0, back), 300, 100, () => {
    skyline(ctx, 0, 0, 300, 100, 23);
    ctx.fillStyle = 'rgba(190,220,255,0.2)';
    ctx.fillRect(0, 0, 300, 100);
    ctx.fillStyle = '#4a5366';
    for (let x = 0; x <= 300; x += 43) ctx.fillRect(x, 0, 3, 100);
  });
  onPanel(ctx, P(x1, 3.6, -10.4), P(x1, 3.6, -7.4), P(x1, 0.2, -10.4), 160, 200, () => {
    ctx.fillStyle = '#f7f3ec';
    ctx.fillRect(0, 0, 160, 200);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, 4, 200);
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1d2433';
    ctx.fillText(signage.directoryTitle[0], 22, 34);
    ctx.fillText(signage.directoryTitle[1], 22, 50);
    ctx.fillStyle = '#e0a84a';
    ctx.fillRect(22, 60, 18, 3);
    ctx.font = '500 11px ui-sans-serif, system-ui, sans-serif';
    signage.directory.slice(0, 5).forEach((name, i) => {
      ctx.fillStyle = '#1d2433';
      ctx.fillText(`${i + 1}`, 22, 86 + i * 22);
      ctx.fillText(name, 42, 86 + i * 22);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(22, 92 + i * 22, 116, 1);
    });
  });
}

function floor(ctx: Ctx): void {
  const { x0, x1, back, front } = ROOM;
  const grad = ctx.createLinearGradient(0, P(0, 0, back).y, 0, LOBBY_H);
  grad.addColorStop(0, '#d9d0c2');
  grad.addColorStop(1, '#efe9e0');
  poly(ctx, [P(x0, 0, front), P(x1, 0, front), P(x1, 0, back), P(x0, 0, back)], grad);
  // Large polished tiles.
  for (let x = -7; x <= 7; x += 1.75) line(ctx, P(x, 0, front), P(x, 0, back), 'rgba(140,125,105,0.28)');
  for (let z = -1.2; z > back; z -= 1.75) line(ctx, P(x0, 0, z), P(x1, 0, z), 'rgba(140,125,105,0.28)');
  // The floor mirrors the ceiling lights as soft, stretched glows.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const z of [-3.6, -6, -8.6, -11.4]) {
    for (const cx of [-3.6, 3.6]) {
      const at = P(cx, -0.9, z);
      const s = scaleAt(z);
      glow(ctx, at.x, at.y, s * 0.9, s * 0.55, 'rgba(255,240,210,0.16)');
    }
  }
  const logo = P(0, -1.4, -9);
  glow(ctx, logo.x, logo.y, 60, 22, 'rgba(255,190,110,0.12)');
  ctx.restore();
}

function glow(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

// ------------------------------------------------------------- furniture

function plant(ctx: Ctx, x: number, z: number, height: number, seed: number): void {
  const pot = 0.22;
  box(ctx, x - pot, x + pot, 0, 0.5, z - pot, z + pot, { top: '#5b4636', front: '#f1efea', side: '#d9d5cd' });
  const base = P(x, 0.5, z);
  const s = scaleAt(z);
  const r = rng(seed);
  for (let i = 0; i < 26; i += 1) {
    const t = r();
    const lx = base.x + (r() - 0.5) * s * 0.9 * (1.1 - t * 0.4);
    const ly = base.y - s * height * (0.15 + t * 0.85);
    const len = s * (0.25 + r() * 0.25);
    const angle = (lx < base.x ? -1 : 1) * (0.3 + r() * 0.9) - Math.PI / 2;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angle);
    ctx.fillStyle = ['#2f7d4a', '#3f9b5e', '#58b06f', '#256b3d'][i % 4];
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, len / 2, len / 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function sofa(ctx: Ctx, x0: number, x1: number, z0: number, z1: number, backAt: 'left' | 'right' | 'back'): void {
  const leather = { top: '#3a3f4b', front: '#2b2f38', side: '#323743' };
  box(ctx, x0, x1, 0.08, 0.45, z0, z1, leather);
  if (backAt === 'left') box(ctx, x0, x0 + 0.25, 0.08, 0.85, z0, z1, leather);
  if (backAt === 'right') box(ctx, x1 - 0.25, x1, 0.08, 0.85, z0, z1, leather);
  if (backAt === 'back') box(ctx, x0, x1, 0.08, 0.85, z0, z0 + 0.25, leather);
  box(ctx, x0, x1, 0, 0.08, z0, z1, { top: '#9aa1ad', front: '#c4c9d1', side: '#a8aeb8' });
}

/** A freestanding wall of dark slats behind reception, with a warm backlit name. */
function logoWall(ctx: Ctx): void {
  const z = -9.2;
  const lo = P(-3.2, 3.6, z);
  const la = P(3.2, 3.6, z);
  const lb = P(-3.2, 0, z);
  onPanel(ctx, lo, la, lb, 300, 185, () => {
    ctx.fillStyle = '#34302c';
    ctx.fillRect(0, 0, 300, 185);
    for (let x = 0; x < 300; x += 6) {
      ctx.fillStyle = x % 12 ? '#3d3833' : '#2c2825';
      ctx.fillRect(x, 0, 3, 185);
    }
    const glow = ctx.createRadialGradient(150, 70, 4, 150, 70, 110);
    glow.addColorStop(0, 'rgba(255,190,110,0.45)');
    glow.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 300, 185);
    // Measure first so mark, name and word sit centred as one group.
    const bold = '800 24px ui-sans-serif, system-ui, sans-serif';
    const light = '600 20px ui-sans-serif, system-ui, sans-serif';
    ctx.font = bold;
    const name = ctx.measureText('X-PASS').width;
    ctx.font = light;
    const word = ctx.measureText('Discover').width;
    const mark = 34;
    const gap = 8;
    let x = 150 - (mark + gap + name + gap + word) / 2;
    xMark(ctx, x, 50, mark * 1.18, '#3b82f6');
    x += mark + gap;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe2b8';
    ctx.font = bold;
    ctx.fillText('X-PASS', x, 72);
    ctx.font = light;
    ctx.fillText('Discover', x + name + gap, 72);
    // Strip light along the top of the wall.
    ctx.fillStyle = '#ffd9a0';
    ctx.fillRect(0, 0, 300, 3);
  });

}

function receptionDesk(ctx: Ctx): void {
  const z0 = -7.7;
  const z1 = -6.9;
  // Monitor first, then the desk front.
  box(ctx, 1.0, 1.6, 1.1, 1.45, -7.5, -7.4, { top: '#d1d5db', front: '#d9dde3', side: '#c1c6ce' });
  box(ctx, -2.7, 1.5, 0, 1.1, z0, z1, { top: '#e9e4da', front: '#2f333c', side: '#2a2e36' });
  box(ctx, 1.5, 2.7, 0, 1.1, z0, z1, { top: '#e9e4da', front: '#c9a06f', side: '#b88f60' });
  // Warm LED strip under the counter.
  const a = P(-2.7, 0.08, z1);
  const b = P(2.7, 0.08, z1);
  ctx.save();
  ctx.shadowColor = 'rgba(255,190,100,0.9)';
  ctx.shadowBlur = 8;
  line(ctx, a, b, '#ffc77a', 2);
  ctx.restore();
  // Its reflection on the floor.
  const g = ctx.createLinearGradient(0, a.y, 0, a.y + 26);
  g.addColorStop(0, 'rgba(255,200,120,0.35)');
  g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(a.x, a.y + 2, b.x - a.x, 26);
  // A lamp, a plant and a small sign on the counter.
  const lamp = P(-2.2, 1.1, -7.2);
  const glow = ctx.createRadialGradient(lamp.x, lamp.y - 10, 1, lamp.x, lamp.y - 10, 22);
  glow.addColorStop(0, 'rgba(255,220,150,0.9)');
  glow.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(lamp.x - 22, lamp.y - 32, 44, 44);
  ctx.fillStyle = '#fff2d2';
  ctx.fillRect(lamp.x - 4, lamp.y - 14, 8, 6);
  ctx.fillStyle = '#3a3f4b';
  ctx.fillRect(lamp.x - 1, lamp.y - 8, 2, 8);
  plant(ctx, 2.25, -7.25, 0.8, 41);
  const sign = P(-1.9, 1.1, -7.0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(sign.x - 4, sign.y - 8, 8, 8);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(sign.x - 3, sign.y - 6, 6, 1);
}

function gates(ctx: Ctx): void {
  const z0 = -6.6;
  const z1 = -6.2;
  for (const x of [3.3, 4.5, 5.7]) {
    box(ctx, x, x + 0.32, 0, 1.0, z0, z1, { top: '#cfd4dc', front: '#9aa1ad', side: '#7d8594' });
    const panel = P(x + 0.04, 0.9, z1);
    const panelEnd = P(x + 0.28, 0.62, z1);
    ctx.fillStyle = '#1d2129';
    ctx.fillRect(panel.x, panel.y, panelEnd.x - panel.x, panelEnd.y - panel.y);
    ctx.fillStyle = '#60a5fa';
    const cx = (panel.x + panelEnd.x) / 2;
    const cy = (panel.y + panelEnd.y) / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 3);
    ctx.lineTo(cx + 3, cy);
    ctx.lineTo(cx + 1, cy);
    ctx.lineTo(cx + 1, cy + 3);
    ctx.lineTo(cx - 1, cy + 3);
    ctx.lineTo(cx - 1, cy);
    ctx.lineTo(cx - 3, cy);
    ctx.closePath();
    ctx.fill();
    // Glass flap to the next pillar.
    if (x < 5.7) {
      poly(ctx, [P(x + 0.32, 0.95, -6.4), P(x + 1.2, 0.95, -6.4), P(x + 1.2, 0.3, -6.4), P(x + 0.32, 0.3, -6.4)], 'rgba(190,225,255,0.35)');
      line(ctx, P(x + 0.32, 0.95, -6.4), P(x + 1.2, 0.95, -6.4), 'rgba(255,255,255,0.7)');
    }
  }
}

function player(ctx: Ctx): void {
  const z = -3.7;
  const feet = P(0.95, 0, z);
  const k = (1.62 * scaleAt(z)) / 52;
  const look: Look = { shirt: 0xf4f2ee, pants: 0x2b2f3a, hair: 0x2e211b, skin: 0xf2c9a5 };
  ctx.save();
  ctx.translate(feet.x, feet.y);
  ctx.scale(k, k);
  drawPerson(ctx, look, 'back', 0);
  // A messenger bag on the left hip.
  ctx.fillStyle = '#20242c';
  ctx.beginPath();
  ctx.roundRect(-15, -27, 10, 12, 2);
  ctx.fill();
  ctx.strokeStyle = '#20242c';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-8, -27);
  ctx.lineTo(6, -37);
  ctx.stroke();
  ctx.restore();
}

function receptionist(ctx: Ctx): void {
  const z = -8.0;
  const feet = P(-1.1, 0, z);
  const k = (1.6 * scaleAt(z)) / 52;
  const look: Look = { shirt: 0xffffff, jacket: 0x262b36, pants: 0x262b36, hair: 0x3b2a20, skin: 0xf2c9a5, long: true };
  ctx.save();
  ctx.translate(feet.x, feet.y);
  ctx.scale(k, k);
  drawPerson(ctx, look, 'front', 0);
  ctx.restore();
}

/** Paints the whole lobby into `ctx`, already scaled to a `LOBBY_W` × `LOBBY_H` frame. */
export function paintLobby(ctx: Ctx, sign: LobbySignage): void {
  signage = sign;
  ctx.clearRect(0, 0, LOBBY_W, LOBBY_H);
  ceiling(ctx);
  backWall(ctx);
  sideWalls(ctx);
  floor(ctx);

  // Back to front.
  plant(ctx, 6.4, -12.2, 1.5, 9);
  logoWall(ctx);
  plant(ctx, -4.0, -8.6, 1.6, 3);
  receptionist(ctx);
  receptionDesk(ctx);
  gates(ctx);
  plant(ctx, -6.4, -12.2, 1.6, 17);
  plant(ctx, 6.4, -6.6, 1.5, 23);
  sofa(ctx, -6.4, -4.2, -6.4, -5.5, 'back');
  plant(ctx, -3.6, -5.2, 1.2, 31);
  player(ctx);

  // Warm grade and a soft vignette.
  const warm = ctx.createRadialGradient(CX, CY + 40, 40, CX, CY + 40, 420);
  warm.addColorStop(0, 'rgba(255,214,150,0.10)');
  warm.addColorStop(1, 'rgba(20,16,30,0.35)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, LOBBY_W, LOBBY_H);
}
