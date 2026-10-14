import { drawPerson, type Look } from '@/game/office/art';

/**
 * The office behind the pre-survey: a warm, lived-in workroom — a motto
 * poster and binder shelves on the left, a city window on the right,
 * colleagues at their desks, and a new hire at a desk in the foreground.
 * Coordinates are in a fixed `SURVEY_W` × `SURVEY_H` frame; the caller scales
 * the context so the picture is painted at full screen resolution.
 */

export const SURVEY_W = 576;
export const SURVEY_H = 384;

/** Extra wall above the scene, so the picture is 3:2 like the area it fills. */
const LIFT = 60;

type Ctx = CanvasRenderingContext2D;

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

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string | CanvasGradient): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

function vgrad(ctx: Ctx, y0: number, y1: number, stops: string[]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach((color, i) => g.addColorStop(i / (stops.length - 1), color));
  return g;
}

function text(ctx: Ctx, value: string, x: number, y: number, size: number, color: string, weight = 700): void {
  ctx.font = `${weight} ${size}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText(value, x, y);
}

function binders(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number): void {
  const r = rng(seed);
  const colors = ['#2f6fb5', '#d9a23a', '#3f9b6e', '#c1543f', '#7b6bb8', '#e0d6c3', '#4a5568'];
  let bx = x;
  while (bx < x + w - 3) {
    const bw = 3 + Math.floor(r() * 4);
    const bh = h * (0.7 + r() * 0.3);
    rect(ctx, bx, y + h - bh, bw, bh, colors[Math.floor(r() * colors.length)]);
    rect(ctx, bx + 1, y + h - bh * 0.55, Math.max(1, bw - 2), 2, 'rgba(255,255,255,0.6)');
    bx += bw + 1;
  }
}

function plant(ctx: Ctx, x: number, y: number, size: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < 18; i += 1) {
    const angle = -Math.PI / 2 + (r() - 0.5) * 2.6;
    const len = size * (0.35 + r() * 0.45);
    ctx.save();
    ctx.translate(x, y - size * 0.25);
    ctx.rotate(angle);
    ctx.fillStyle = ['#2f7d4a', '#3f9b5e', '#58b06f', '#256b3d'][i % 4];
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, len / 2, len / 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  rect(ctx, x - size * 0.22, y - size * 0.25, size * 0.44, size * 0.3, '#f1efea');
  rect(ctx, x - size * 0.22, y - size * 0.25, size * 0.44, 2, '#5b4636');
}

function monitor(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  rect(ctx, x, y, w, h, '#2a2f3a');
  rect(ctx, x + 2, y + 2, w - 4, h - 5, vgrad(ctx, y, y + h, ['#cfe3ff', '#8fb6ee']));
  rect(ctx, x + w / 2 - 2, y + h, 4, 4, '#2a2f3a');
  rect(ctx, x + w / 2 - 6, y + h + 4, 12, 2, '#2a2f3a');
}

/** A desk seen from the front: top, modesty panel and a monitor. */
function deskRow(ctx: Ctx, x: number, y: number, w: number, seed: number): void {
  rect(ctx, x, y, w, 4, '#c99a68');
  rect(ctx, x, y + 4, w, 14, '#a57e52');
  rect(ctx, x + 3, y + 18, 3, 10, '#6b7280');
  rect(ctx, x + w - 6, y + 18, 3, 10, '#6b7280');
  const r = rng(seed);
  for (let mx = x + 6; mx < x + w - 24; mx += 30 + r() * 10) monitor(ctx, mx, y - 18, 20, 14);
}

function window(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  rect(ctx, x - 4, y - 4, w + 8, h + 8, '#4a5366');
  rect(ctx, x, y, w, h, vgrad(ctx, y, y + h, ['#f6c69a', '#f4dcc0', '#cfdbe8', '#a9bcd2']));
  const r = rng(91);
  // A broadcast tower on the hill, then two layers of towers.
  rect(ctx, x + w * 0.62, y + h * 0.18, 2, h * 0.3, '#7d8fa8');
  rect(ctx, x + w * 0.62 - 3, y + h * 0.3, 8, 4, '#7d8fa8');
  ctx.fillStyle = '#9fb2c8';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.62, y + h * 0.5, w * 0.35, h * 0.08, 0, Math.PI, 0);
  ctx.fill();
  for (const [color, minH, maxH] of [
    ['#9fb2c8', 0.18, 0.4],
    ['#6f86a3', 0.12, 0.32],
  ] as const) {
    let bx = x - 2;
    while (bx < x + w) {
      const bw = 6 + r() * 12;
      const bh = h * (minH + r() * (maxH - minH));
      rect(ctx, bx, y + h - bh, bw, bh, color);
      if (color === '#6f86a3') {
        for (let wy = y + h - bh + 3; wy < y + h - 2; wy += 4) {
          for (let wx = bx + 2; wx < bx + bw - 2; wx += 3) {
            if (r() > 0.55) rect(ctx, wx, wy, 1, 2, 'rgba(255,232,170,0.9)');
          }
        }
      }
      bx += bw + r() * 3;
    }
  }
  ctx.fillStyle = '#4a5366';
  for (let mx = x; mx <= x + w; mx += w / 3) ctx.fillRect(mx - 1.5, y, 3, h);
  ctx.fillRect(x, y + h * 0.42, w, 3);
  // Reflection.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + h * 0.4);
  ctx.lineTo(x + 34, y + 6);
  ctx.stroke();
}

/** Paints the survey room into `ctx`, already scaled to a `SURVEY_W` × `SURVEY_H` frame. */
export function paintSurveyRoom(ctx: Ctx): void {
  const W = SURVEY_W;
  ctx.clearRect(0, 0, W, SURVEY_H);

  // Ceiling with its lights, then the scene below it.
  rect(ctx, 0, 0, W, 30, '#d9ccb4');
  for (let x = 30; x < W; x += 120) {
    rect(ctx, x, 12, 60, 6, '#fff8e6');
    rect(ctx, x - 6, 18, 72, 4, 'rgba(255,236,190,0.4)');
  }
  rect(ctx, 0, 30, W, LIFT, '#efe4cf');
  ctx.save();
  ctx.translate(0, LIFT);
  const H = SURVEY_H - LIFT;
  rect(ctx, 0, 0, W, 16, '#efe4cf');
  rect(ctx, 0, 16, W, 196, vgrad(ctx, 16, 212, ['#efe4cf', '#e4d6bc']));
  rect(ctx, 0, 206, W, 6, '#8c6a4c');
  rect(ctx, 0, 212, W, H - 212, vgrad(ctx, 212, H, ['#b9bcc2', '#d3d5d9']));
  const speck = rng(5);
  for (let i = 0; i < 900; i += 1) {
    rect(ctx, speck() * W, 212 + speck() * (H - 212), 1, 1, speck() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(40,46,58,0.12)');
  }

  // Left: the motto poster, a clock, binder shelves and a coffee machine.
  rect(ctx, 54, 28, 74, 92, '#3a3f4b');
  rect(ctx, 57, 31, 68, 86, '#fbfaf6');
  text(ctx, 'Good', 63, 48, 10, '#1d2433');
  text(ctx, 'Experiences', 63, 61, 10, '#1d2433');
  text(ctx, 'Shape', 63, 74, 10, '#1d2433');
  text(ctx, 'Better', 63, 87, 10, '#1d2433');
  text(ctx, 'Careers.', 63, 100, 10, '#1d2433');
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(106, 102);
  ctx.lineTo(116, 112);
  ctx.moveTo(116, 102);
  ctx.lineTo(106, 112);
  ctx.stroke();

  rect(ctx, 8, 128, 150, 78, '#a57e52');
  for (const sy of [134, 160, 186]) {
    rect(ctx, 12, sy, 142, 20, '#5b4636');
    binders(ctx, 14, sy, 138, 20, sy);
    rect(ctx, 8, sy + 20, 150, 3, '#c99a68');
  }
  rect(ctx, 160, 150, 44, 56, '#9ea6b3');
  rect(ctx, 162, 166, 40, 1, 'rgba(0,0,0,0.25)');
  rect(ctx, 162, 184, 40, 1, 'rgba(0,0,0,0.25)');
  rect(ctx, 168, 118, 28, 32, '#2b303b');
  rect(ctx, 172, 122, 20, 8, '#4b5563');
  rect(ctx, 176, 136, 12, 10, '#7a4a2a');
  rect(ctx, 178, 133, 8, 3, '#d1d5db');
  plant(ctx, 222, 206, 46, 3);

  // Right: the city window, plants along the sill.
  window(ctx, 404, 26, 168, 150);
  rect(ctx, 398, 178, 178, 6, '#e9e2d5');
  plant(ctx, 412, 206, 40, 9);
  plant(ctx, 560, 206, 54, 17);

  // Middle distance: a row of desks with colleagues at work.
  const colleague = (x: number, shirt: number, hair: number, long = false) => {
    const look: Look = { shirt, pants: 0x2b2f3a, hair, skin: 0xf2c9a5, long };
    ctx.save();
    ctx.translate(x, 214);
    ctx.scale(0.62, 0.62);
    drawPerson(ctx, look, 'back', 0, 'sit');
    ctx.restore();
  };
  colleague(268, 0x2f6fb5, 0x2b2230);
  colleague(512, 0x3f9b6e, 0x6b4a33, true);
  deskRow(ctx, 236, 214, 150, 4);
  deskRow(ctx, 448, 214, 128, 8);

  // Foreground right: a printer stand and a stack of files.
  rect(ctx, 470, 262, 106, 62, '#a57e52');
  rect(ctx, 470, 258, 106, 6, '#c99a68');
  binders(ctx, 478, 236, 60, 22, 33);
  rect(ctx, 540, 240, 30, 18, '#e5e7eb');
  rect(ctx, 543, 236, 24, 4, '#9ca3af');

  // Foreground left: the new hire at their desk, CRT monitor, phone and mug.
  const me: Look = { shirt: 0xf4f2ee, pants: 0x2b2f3a, hair: 0x4a3326, skin: 0xf2c9a5, tie: 0x2563eb };
  ctx.save();
  ctx.translate(92, 262);
  ctx.scale(1.35, 1.35);
  drawPerson(ctx, me, 'front', 0, 'sit');
  ctx.restore();
  rect(ctx, 0, 262, 250, 8, '#c99a68');
  rect(ctx, 0, 270, 250, H - 270, '#9c7650');
  rect(ctx, 0, 270, 250, 2, 'rgba(0,0,0,0.25)');
  // CRT monitor.
  rect(ctx, 140, 204, 74, 56, '#e7e0cf');
  rect(ctx, 146, 210, 62, 42, '#3a3f4b');
  rect(ctx, 149, 213, 56, 36, vgrad(ctx, 213, 249, ['#dbeafe', '#93c5fd']));
  rect(ctx, 152, 217, 30, 3, '#2563eb');
  rect(ctx, 152, 224, 46, 2, 'rgba(30,41,59,0.35)');
  rect(ctx, 152, 230, 40, 2, 'rgba(30,41,59,0.35)');
  rect(ctx, 152, 236, 44, 2, 'rgba(30,41,59,0.35)');
  rect(ctx, 166, 260, 22, 3, '#cfc6b3');
  rect(ctx, 120, 262, 70, 5, '#d8d2c4');
  // Mug, phone, pencil cup.
  rect(ctx, 20, 248, 14, 15, '#ffffff');
  rect(ctx, 34, 252, 4, 7, '#ffffff');
  text(ctx, 'X', 23, 260, 9, '#2563eb', 800);
  rect(ctx, 206, 252, 30, 11, '#2b303b');
  rect(ctx, 210, 246, 22, 6, '#3a3f4b');
  rect(ctx, 46, 250, 9, 13, '#4b5563');
  rect(ctx, 47, 244, 2, 6, '#d9a23a');
  rect(ctx, 51, 242, 2, 8, '#2563eb');

  ctx.restore();

  // Warm light from the window and a soft vignette.
  const warm = ctx.createRadialGradient(470, 90 + LIFT, 10, 470, 90 + LIFT, 360);
  warm.addColorStop(0, 'rgba(255,214,150,0.18)');
  warm.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, SURVEY_H);
  const vignette = ctx.createRadialGradient(W / 2, SURVEY_H / 2, 140, W / 2, SURVEY_H / 2, 400);
  vignette.addColorStop(0, 'rgba(20,16,30,0)');
  vignette.addColorStop(1, 'rgba(20,16,30,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, SURVEY_H);
}
