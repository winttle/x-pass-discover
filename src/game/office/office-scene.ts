import * as Phaser from 'phaser';
import {
  CORRIDORS,
  GRID_HEIGHT,
  GRID_WIDTH,
  NPCS,
  PROPS,
  ROOMS,
  SPAWN,
  TILE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  WALL_DECOR,
  buildWallGrid,
  toPixels,
  type OfficeNpc,
  type OfficeProp,
  type OfficeRoom,
} from './map';
import {
  HALF_H,
  HALF_W,
  ISO_ORIGIN_X,
  ISO_ORIGIN_Y,
  ISO_WORLD_HEIGHT,
  ISO_WORLD_WIDTH,
  depthAt,
  tileCenter,
  toScreen,
} from './iso';
import {
  bookcasePiece,
  boxesPiece,
  cabinetPiece,
  chairPiece,
  coatrackPiece,
  coffeePiece,
  counterPiece,
  deskPiece,
  drawPerson,
  drawSignIcon,
  lampPiece,
  panelPiece,
  plantPiece,
  printerPiece,
  rgb,
  rng,
  serverPiece,
  shade,
  shelfPiece,
  sofaPiece,
  tablePiece,
  wallPiece,
  waterPiece,
  type Edges,
  type Facing,
  type Look,
  type Piece,
  type SignIcon,
  type View,
  type WallDecorSlice,
  type WallKind,
} from './art';
import { FLOORS, PALETTE, type FloorMaterial } from './theme';
import type { OfficeBridge } from './bridge';
import { ENGLISH_LABELS, type OfficeLabels } from './labels';

const PLAYER_SPEED = 215;
const NPC_INTERACT_RADIUS = 60;
const CAMERA_ZOOM = 1.3;
const PLAYER_SIZE = 22;

/** Pieces and people are baked at 2× and the floor at 1.5×, then shown scaled down. */
const PIECE_RES = 2;
const FLOOR_RES = 1.5;
const PERSON_W = 48;
const PERSON_H = 70;
const PERSON_FEET = 62;

/** Layers that never sort against the player. */
const DEPTH_FLOOR = -10;
const DEPTH_TILE_GLOW = -5;
const DEPTH_SIGNS = 5_000;
const DEPTH_BUBBLES = 6_000;

const WALL_HEIGHTS: Record<WallKind, number> = { back: 120, low: 24, glass: 10 };

type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * The BITE office scene, in 2.5D.
 *
 * Two worlds share this scene. The *logical* office is the flat tile grid from
 * `map.ts`: an invisible physics body walks it, collides with its walls and
 * furniture, and decides which room the player is in — exactly as before, so
 * `verify:office`, the minimap and the bridge events are unchanged. The
 * *visible* office is that grid projected isometrically (`iso.ts`) and drawn
 * procedurally (`art.ts`); every frame the avatar is placed where the body is.
 *
 * It holds no business state: every meaningful interaction is emitted to React
 * through the bridge.
 */
export class OfficeScene extends Phaser.Scene {
  private bridge: OfficeBridge;
  /** The logical player: an invisible body on the tile grid. */
  private mover!: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
  /** The visible player, positioned from `mover` after physics runs. */
  private avatar!: Phaser.GameObjects.Container;
  private avatarBody!: Phaser.GameObjects.Image;
  private tileGlow!: Phaser.GameObjects.Graphics;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private currentRoomKey: string | null = null;
  private currentPrompt: string | null = null;
  private nearbyNpc: OfficeNpc | null = null;
  private keycap!: Phaser.GameObjects.Container;
  private speech!: Phaser.GameObjects.Container;
  private speechName!: Phaser.GameObjects.Text;
  private speechRole!: Phaser.GameObjects.Text;
  private speechBg!: Phaser.GameObjects.Graphics;
  private speechFor: string | null = null;
  private facing: Direction = 'down';
  private walkPhase = 0;
  private wasMoving = false;
  private lastReportedTile = { x: -1, y: -1 };

  private labels: OfficeLabels;

  constructor(bridge: OfficeBridge, labels: OfficeLabels = ENGLISH_LABELS) {
    super('office');
    this.bridge = bridge;
    this.labels = labels;
  }

  /**
   * Debug/testing handle for the avatar. The experience layer holds no business
   * state, so exposing it carries no information the player does not already
   * have on screen.
   */
  get playerRef(): Phaser.GameObjects.Container {
    return this.avatar;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, ISO_WORLD_WIDTH, ISO_WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(PALETTE.void);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.setRoundPixels(true);

    const walls = buildWallGrid();
    this.paintFloor(walls);
    this.placeWalls(walls);
    this.placeProps();
    this.placeRoomSigns();
    this.createNpcs();

    const wallBodies = this.createWallBodies(walls);
    const propBodies = this.createPropBodies();
    this.createPlayer();
    this.createBubbles();

    this.physics.add.collider(this.mover, wallBodies);
    this.physics.add.collider(this.mover, propBodies);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.keys = keyboard.addKeys('W,A,S,D') as NonNullable<typeof this.keys>;
      keyboard.on('keydown-E', () => this.handleInteract());
      // Arrow keys would otherwise scroll the page behind the canvas.
      keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    }

    // Physics moves the body during the scene's update; the avatar follows it
    // once the step has settled, so the two never drift a frame apart.
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncAvatar, this);
    this.syncAvatar();

    this.cameras.main.startFollow(this.avatar, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(120, 80);
    this.cameras.main.fadeIn(420, 29, 36, 51);

    this.bridge.emit({ type: 'ready' });
  }

  // ------------------------------------------------------------------- floor

  /**
   * The floor is flat, so all of it — boards, carpet and stone, rugs, the soft
   * shadows furniture casts, light falling in from the windows and the shade
   * at the foot of every wall — is painted once into a single canvas at 1.5×
   * and shown as one image. It is drawn in *tile space*: the canvas is skewed
   * so a floor tile is a unit square.
   */
  private paintFloor(walls: boolean[][]): void {
    const key = 'office-floor';
    if (this.textures.exists(key)) this.textures.remove(key);
    const texture = this.textures.createCanvas(
      key,
      Math.ceil(ISO_WORLD_WIDTH * FLOOR_RES),
      Math.ceil(ISO_WORLD_HEIGHT * FLOOR_RES),
    );
    if (!texture) return;
    const ctx = texture.getContext();
    ctx.setTransform(FLOOR_RES, 0, 0, FLOOR_RES, 0, 0);

    // The building's slab: its two front edges drop away into the night.
    const slab = 26;
    const sw = toScreen(0, GRID_HEIGHT);
    const se = toScreen(GRID_WIDTH, GRID_HEIGHT);
    const ne = toScreen(GRID_WIDTH, 0);
    const quad = (points: Array<{ x: number; y: number }>, fill: string | CanvasGradient) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
    };
    quad([sw, se, { x: se.x, y: se.y + slab }, { x: sw.x, y: sw.y + slab }], '#3a4256');
    quad([se, ne, { x: ne.x, y: ne.y + slab }, { x: se.x, y: se.y + slab }], '#2a3142');

    ctx.save();
    ctx.transform(HALF_W, HALF_H, -HALF_W, HALF_H, ISO_ORIGIN_X, ISO_ORIGIN_Y);

    const materialAt = this.floorMaterials(walls);
    for (let row = 0; row < GRID_HEIGHT; row += 1) {
      for (let col = 0; col < GRID_WIDTH; col += 1) {
        const material = materialAt[row][col];
        if (material) this.paintTile(ctx, col, row, material);
        else {
          ctx.fillStyle = rgb(PALETTE.partition);
          ctx.fillRect(col - 0.01, row - 0.01, 1.02, 1.02);
        }
      }
    }

    this.paintRugs(ctx);
    this.paintDoorways(ctx);
    this.paintContactShadows(ctx);
    this.paintWallShade(ctx, walls);
    this.paintWindowLight(ctx, walls);

    ctx.restore();
    texture.refresh();
    this.add.image(0, 0, key).setOrigin(0, 0).setScale(1 / FLOOR_RES).setDepth(DEPTH_FLOOR);
  }

  private floorMaterials(walls: boolean[][]): Array<Array<FloorMaterial | null>> {
    const grid: Array<Array<FloorMaterial | null>> = walls.map((row) =>
      row.map((isWall) => (isWall ? null : PALETTE.corridor)),
    );
    for (const room of ROOMS) {
      for (let row = room.y; row < room.y + room.h; row += 1) {
        for (let col = room.x; col < room.x + room.w; col += 1) {
          if (!walls[row][col]) grid[row][col] = room.floor;
        }
      }
    }
    for (const corridor of CORRIDORS) {
      for (let row = corridor.y; row < corridor.y + corridor.h; row += 1) {
        for (let col = corridor.x; col < corridor.x + corridor.w; col += 1) {
          if (!walls[row][col] && !this.roomAtTile(col, row)) grid[row][col] = PALETTE.corridor;
        }
      }
    }
    return grid;
  }

  /** One floor tile, in tile space (the tile is the unit square at col,row). */
  private paintTile(ctx: CanvasRenderingContext2D, col: number, row: number, material: FloorMaterial): void {
    const { base, alt, seam } = FLOORS[material];
    const r = rng(col * 7919 + row * 104729 + 17);
    const line = 1 / 32;

    if (material === 'wood' || material === 'walnut') {
      // Four boards per tile running along x, each board a few tiles long with
      // staggered joints and its own tone.
      for (let k = 0; k < 4; k += 1) {
        const strip = row * 4 + k;
        const sr = rng(strip * 31 + 7);
        const length = 2 + Math.floor(sr() * 3);
        const offset = Math.floor(sr() * length);
        const board = Math.floor((col + offset) / length);
        const br = rng(strip * 977 + board * 13);
        const tone = shade(br() > 0.5 ? base : alt, 0.94 + br() * 0.1);
        const y = row + k / 4;
        ctx.fillStyle = rgb(tone);
        ctx.fillRect(col - 0.005, y, 1.01, 0.25);
        for (let g = 0; g < 3; g += 1) {
          ctx.strokeStyle = rgb(shade(tone, 0.78), 0.18 + r() * 0.2);
          ctx.lineWidth = line * (0.4 + r() * 0.6);
          const gy = y + 0.04 + r() * 0.17;
          ctx.beginPath();
          ctx.moveTo(col, gy);
          ctx.quadraticCurveTo(col + 0.5, gy + (r() - 0.5) * 0.05, col + 1, gy + (r() - 0.5) * 0.03);
          ctx.stroke();
        }
        ctx.fillStyle = rgb(seam, 0.55);
        ctx.fillRect(col, y, 1, line * 0.9);
        if ((col + offset) % length === 0) ctx.fillRect(col, y, line, 0.25);
      }
      // A satin finish catches a little light.
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(col, row, 1, 0.5);
      return;
    }

    if (material === 'carpet') {
      // Carpet tiles laid in alternating pile direction, with a fine speckle.
      const flip = (col + row) % 2 === 0;
      const grad = ctx.createLinearGradient(col, row, flip ? col + 1 : col, flip ? row : row + 1);
      grad.addColorStop(0, rgb(shade(base, 1.02)));
      grad.addColorStop(1, rgb(shade(alt, 0.98)));
      ctx.fillStyle = grad;
      ctx.fillRect(col - 0.005, row - 0.005, 1.01, 1.01);
      for (let i = 0; i < 70; i += 1) {
        ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(40,46,58,0.13)';
        ctx.fillRect(col + r(), row + r(), line * 1.1, line * 1.1);
      }
      ctx.fillStyle = rgb(seam, 0.45);
      ctx.fillRect(col, row, 1, line * 0.8);
      ctx.fillRect(col, row, line * 0.8, 1);
      return;
    }

    if (material === 'stone') {
      // Large marble slabs, two tiles square, with soft veins.
      const slab = rng(Math.floor(col / 2) * 61 + Math.floor(row / 2) * 997);
      const tone = shade(slab() > 0.5 ? base : alt, 0.98 + slab() * 0.04);
      const grad = ctx.createLinearGradient(col, row, col + 1, row + 1);
      grad.addColorStop(0, rgb(shade(tone, 1.03)));
      grad.addColorStop(1, rgb(tone));
      ctx.fillStyle = grad;
      ctx.fillRect(col - 0.005, row - 0.005, 1.01, 1.01);
      ctx.strokeStyle = 'rgba(150,140,128,0.22)';
      ctx.lineWidth = line * 0.8;
      for (let v = 0; v < 2; v += 1) {
        ctx.beginPath();
        ctx.moveTo(col + r(), row);
        ctx.bezierCurveTo(col + r(), row + 0.3, col + r(), row + 0.7, col + r(), row + 1);
        ctx.stroke();
      }
      ctx.fillStyle = rgb(seam, 0.7);
      if (col % 2 === 0) ctx.fillRect(col, row, line, 1);
      if (row % 2 === 0) ctx.fillRect(col, row, 1, line);
      return;
    }

    // Ceramic tile: four squares per floor tile with grout and a gloss.
    for (let i = 0; i < 4; i += 1) {
      const x = col + (i % 2) * 0.5;
      const y = row + Math.floor(i / 2) * 0.5;
      ctx.fillStyle = rgb(shade(r() > 0.5 ? base : alt, 0.98 + r() * 0.04));
      ctx.fillRect(x, y, 0.5, 0.5);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 0.04, y + 0.04, 0.2, 0.08);
      ctx.fillStyle = rgb(seam, 0.8);
      ctx.fillRect(x, y, 0.5, line);
      ctx.fillRect(x, y, line, 0.5);
    }
  }

  private paintRugs(ctx: CanvasRenderingContext2D): void {
    for (const prop of PROPS) {
      if (prop.kind !== 'rug') continue;
      const w = prop.w ?? 1;
      const h = prop.h ?? 1;
      const room = this.roomAtTile(prop.x, prop.y);
      const color = prop.accent ?? (room?.key === 'my-desk' ? 0x3b6fc4 : room?.floor === 'wood' || room?.floor === 'walnut' ? 0x9c8f7d : 0x8090a8);
      const x = prop.x + 0.12;
      const y = prop.y + 0.12;
      const rw = w - 0.24;
      const rh = h - 0.24;
      ctx.fillStyle = 'rgba(15,23,41,0.12)';
      ctx.fillRect(x + 0.05, y + 0.05, rw, rh);
      ctx.fillStyle = rgb(color, 0.9);
      ctx.fillRect(x, y, rw, rh);
      const r = rng(prop.x * 13 + prop.y);
      for (let i = 0; i < rw * rh * 90; i += 1) {
        ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(x + r() * rw, y + r() * rh, 0.03, 0.03);
      }
      ctx.strokeStyle = rgb(shade(color, 1.45), 0.8);
      ctx.lineWidth = 0.05;
      ctx.strokeRect(x + 0.18, y + 0.18, rw - 0.36, rh - 0.36);
      ctx.strokeStyle = rgb(shade(color, 0.7), 0.6);
      ctx.lineWidth = 0.025;
      ctx.strokeRect(x + 0.28, y + 0.28, rw - 0.56, rh - 0.56);
    }
  }

  private paintDoorways(ctx: CanvasRenderingContext2D): void {
    for (const room of ROOMS) {
      for (const door of room.doors) {
        ctx.fillStyle = 'rgba(160,168,182,0.9)';
        ctx.fillRect(door.x + 0.05, door.y + 0.42, 0.9, 0.16);
        ctx.fillStyle = rgb(PALETTE.threshold, 0.22);
        ctx.fillRect(door.x + 0.1, door.y + 0.1, 0.8, 0.8);
      }
    }
  }

  /**
   * Soft shadows under furniture, offset away from the light (which comes from
   * the back-left windows), built up in layers so the edge fades.
   */
  private paintContactShadows(ctx: CanvasRenderingContext2D): void {
    for (const prop of PROPS) {
      if (prop.kind === 'rug') continue;
      const w = prop.w ?? 1;
      const h = prop.h ?? 1;
      const tall = ['shelf', 'server', 'bookcase', 'cabinet', 'water', 'coffee', 'counter', 'boxes', 'printer'].includes(prop.kind);
      const reach = tall ? 0.35 : 0.18;
      for (let i = 0; i < 5; i += 1) {
        const grow = i * 0.05;
        ctx.fillStyle = `rgba(30,26,22,${tall ? 0.06 : 0.05})`;
        ctx.fillRect(
          prop.x + 0.08 - grow + reach * 0.4,
          prop.y + 0.08 - grow + reach * 0.4,
          w - 0.16 + grow * 2 + reach * 0.6,
          h - 0.16 + grow * 2 + reach * 0.6,
        );
      }
    }
  }

  /** Ambient occlusion: floor darkens where it meets a wall. */
  private paintWallShade(ctx: CanvasRenderingContext2D, walls: boolean[][]): void {
    const isWall = (c: number, r: number) => r < 0 || c < 0 || r >= GRID_HEIGHT || c >= GRID_WIDTH || walls[r][c];
    for (let row = 0; row < GRID_HEIGHT; row += 1) {
      for (let col = 0; col < GRID_WIDTH; col += 1) {
        if (walls[row][col]) continue;
        const strength = (tall: boolean) => (tall ? 0.3 : 0.18);
        if (isWall(col, row - 1)) {
          const g = ctx.createLinearGradient(0, row, 0, row + 0.45);
          g.addColorStop(0, `rgba(30,26,22,${strength(row - 1 === 0)})`);
          g.addColorStop(1, 'rgba(30,26,22,0)');
          ctx.fillStyle = g;
          ctx.fillRect(col, row, 1, 0.45);
        }
        if (isWall(col - 1, row)) {
          const g = ctx.createLinearGradient(col, 0, col + 0.45, 0);
          g.addColorStop(0, `rgba(30,26,22,${strength(col - 1 === 0)})`);
          g.addColorStop(1, 'rgba(30,26,22,0)');
          ctx.fillStyle = g;
          ctx.fillRect(col, row, 0.45, 1);
        }
        if (isWall(col, row + 1)) {
          ctx.fillStyle = 'rgba(30,26,22,0.1)';
          ctx.fillRect(col, row + 0.88, 1, 0.12);
        }
        if (isWall(col + 1, row)) {
          ctx.fillStyle = 'rgba(30,26,22,0.1)';
          ctx.fillRect(col + 0.88, row, 0.12, 1);
        }
      }
    }
  }

  /** Daylight from the back windows lands on the floor as long soft panes. */
  private paintWindowLight(ctx: CanvasRenderingContext2D, walls: boolean[][]): void {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const pane = (points: Array<[number, number]>, from: [number, number], to: [number, number]) => {
      const g = ctx.createLinearGradient(from[0], from[1], to[0], to[1]);
      g.addColorStop(0, 'rgba(255,250,230,0.85)');
      g.addColorStop(1, 'rgba(255,250,230,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    };
    for (let col = 1; col < GRID_WIDTH; col += 1) {
      if (!this.backWallStyle(col, 0).window || walls[1]?.[col]) continue;
      pane(
        [[col + 0.12, 1], [col + 0.88, 1], [col + 2.2, 4.2], [col + 1.45, 4.2]],
        [col, 1],
        [col + 1, 4.2],
      );
    }
    for (let row = 1; row < GRID_HEIGHT; row += 1) {
      if (!this.backWallStyle(0, row).window || walls[row]?.[1]) continue;
      pane(
        [[1, row + 0.12], [1, row + 0.88], [4.2, row + 2.2], [4.2, row + 1.45]],
        [1, row],
        [4.2, row + 1],
      );
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ pieces

  /**
   * Bakes a one-tile piece once per distinct look, at 2× so it stays sharp
   * under the camera's zoom, and places it on the grid.
   */
  private placePiece(piece: Piece, col: number, row: number): void {
    const pad = 14;
    const width = 64 + pad * 2;
    const height = piece.height + 32 + pad * 2;
    const originX = 32 + pad;
    const originY = piece.height + 16 + pad;

    const key = `piece:${piece.key}`;
    if (!this.textures.exists(key)) {
      const texture = this.textures.createCanvas(key, width * PIECE_RES, height * PIECE_RES);
      if (!texture) return;
      const ctx = texture.getContext();
      ctx.scale(PIECE_RES, PIECE_RES);
      ctx.translate(originX, originY);
      piece.draw(ctx);
      texture.refresh();
    }

    const at = tileCenter(col, row);
    this.add
      .image(at.x, at.y, key)
      .setOrigin(originX / width, originY / height)
      .setScale(1 / PIECE_RES)
      .setDepth(depthAt(col + 0.5, row + 0.5));
  }

  // ------------------------------------------------------------------- walls

  /** What a back-wall tile shows: a window, part of a decoration, or plaster. */
  private backWallStyle(col: number, row: number): { window: boolean; decor?: WallDecorSlice } {
    for (const decor of WALL_DECOR) {
      if (row === 0 && decor.y === 0 && col >= decor.x && col < decor.x + decor.w) {
        return { window: false, decor: { ...decor, index: col - decor.x, width: decor.w } };
      }
      if (col === 0 && decor.x === 0 && decor.y > 0 && row >= decor.y && row < decor.y + decor.w) {
        // Along the west wall, reading order runs against tile-space y.
        return { window: false, decor: { ...decor, index: decor.w - 1 - (row - decor.y), width: decor.w } };
      }
    }
    return { window: (col + row) % 4 !== 0 };
  }

  private placeWalls(walls: boolean[][]): void {
    const kindAt = (col: number, row: number): WallKind | null => {
      if (col < 0 || row < 0 || col >= GRID_WIDTH || row >= GRID_HEIGHT) return null;
      if (!walls[row][col]) return null;
      // The building's north and west walls are the backdrop: tall, windowed.
      if (row === 0 || col === 0) return 'back';
      // Its south and east walls face the camera, so they stay low.
      if (row === GRID_HEIGHT - 1 || col === GRID_WIDTH - 1) return 'low';
      const bordersGlass = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) =>
        this.roomAtTile(col + dx, row + dy)?.glass,
      );
      return bordersGlass ? 'glass' : 'low';
    };
    const heightAt = (col: number, row: number) => {
      const kind = kindAt(col, row);
      return kind ? WALL_HEIGHTS[kind] : 0;
    };

    for (let row = 0; row < GRID_HEIGHT; row += 1) {
      for (let col = 0; col < GRID_WIDTH; col += 1) {
        const kind = kindAt(col, row);
        if (!kind) continue;
        // A side is visible wherever whatever stands in front of it is lower.
        const own = WALL_HEIGHTS[kind];
        const faces = {
          south: heightAt(col, row + 1) < own,
          east: heightAt(col + 1, row) < own,
        };
        const style = kind === 'back' ? this.backWallStyle(col, row) : {};
        this.placePiece(wallPiece(kind, faces, (col * 3 + row * 5) % 8, style), col, row);
      }
    }
  }

  /**
   * Merges each row's wall tiles into horizontal runs — a few dozen physics
   * bodies instead of several hundred one-tile ones. These live on the logical
   * grid and are never drawn.
   */
  private createWallBodies(walls: boolean[][]): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (let row = 0; row < GRID_HEIGHT; row += 1) {
      let runStart: number | null = null;
      for (let col = 0; col <= GRID_WIDTH; col += 1) {
        const isWall = col < GRID_WIDTH && walls[row][col];
        if (isWall && runStart === null) runStart = col;
        if (!isWall && runStart !== null) {
          const width = (col - runStart) * TILE;
          const rect = this.add
            .rectangle(runStart * TILE + width / 2, row * TILE + TILE / 2, width, TILE)
            .setVisible(false);
          this.physics.add.existing(rect, true);
          group.add(rect);
          runStart = null;
        }
      }
    }
    return group;
  }

  // --------------------------------------------------------------- furniture

  private placeProps(): void {
    PROPS.forEach((prop, index) => {
      if (prop.kind === 'rug') return;
      const w = prop.w ?? 1;
      const h = prop.h ?? 1;
      for (let row = prop.y; row < prop.y + h; row += 1) {
        for (let col = prop.x; col < prop.x + w; col += 1) {
          const edges: Edges = {
            w: col === prop.x,
            e: col === prop.x + w - 1,
            n: row === prop.y,
            s: row === prop.y + h - 1,
          };
          const along = {
            index: w >= h ? col - prop.x : row - prop.y,
            length: Math.max(w, h),
          };
          const piece = this.pieceFor(prop, edges, along, index * 31 + col * 7 + row);
          if (piece) this.placePiece(piece, col, row);
        }
      }
    });
  }

  private pieceFor(
    prop: OfficeProp,
    edges: Edges,
    along: { index: number; length: number },
    seed: number,
  ): Piece | null {
    const w = prop.w ?? 1;
    const h = prop.h ?? 1;
    const room = this.roomAtTile(prop.x, prop.y);
    const propSeed = prop.x * 41 + prop.y * 7;
    switch (prop.kind) {
      case 'desk':
        return deskPiece(edges, {
          monitor: !!prop.monitor && along.index === Math.floor((along.length - 1) / 2),
          accent: prop.accent,
          wood: room?.floor === 'walnut' ? PALETTE.walnut : PALETTE.wood,
          clutter: seed,
          along,
          seed: propSeed,
        });
      case 'table':
        return tablePiece(edges, {
          top: room?.glass ? PALETTE.tableTop : PALETTE.wood,
          laptop: !edges.n && !edges.w && (edges.s || edges.e) && seed % 2 === 0,
          along,
          seed: propSeed,
        });
      case 'coffeetable':
        return tablePiece(edges, { top: PALETTE.walnut, laptop: false, along, seed: propSeed, low: true });
      case 'counter':
        return counterPiece(edges, along);
      case 'shelf':
        return shelfPiece(edges, seed, along);
      case 'bookcase':
        return bookcasePiece(edges, seed, along);
      case 'server':
        return serverPiece();
      case 'sofa':
        return sofaPiece(edges, edges.w);
      case 'chair':
        return chairPiece(
          this.chairFacing(prop),
          prop.occupant !== undefined ? { look: this.occupantLook(prop.occupant, seed) } : undefined,
          seed,
        );
      case 'plant':
        return plantPiece(seed, seed % 2 === 0);
      case 'board':
      case 'screen':
        return panelPiece(edges, {
          axis: w >= h ? 'x' : 'y',
          screen: prop.kind === 'screen',
          along,
          lines: prop.lines ?? [],
          cork: room?.action.kind === 'notifications',
        });
      case 'cabinet':
        return cabinetPiece(seed);
      case 'coffee':
        return coffeePiece(edges, along);
      case 'water':
        return waterPiece();
      case 'coatrack':
        return coatrackPiece();
      case 'boxes':
        return boxesPiece(seed);
      case 'lamp':
        return lampPiece();
      case 'printer':
        return printerPiece();
      default:
        return null;
    }
  }

  private occupantLook(shirt: number, seed: number): Look {
    return {
      shirt,
      pants: PALETTE.pants,
      hair: PALETTE.hair[seed % PALETTE.hair.length],
      skin: seed % 3 === 0 ? 0xe8b98f : PALETTE.skin,
      long: seed % 3 === 1,
    };
  }

  /** A chair faces whatever desk or table it is pulled up to. */
  private chairFacing(chair: OfficeProp): Facing {
    const surfaces = PROPS.filter(
      (p) => p.kind === 'desk' || p.kind === 'table' || p.kind === 'counter',
    );
    const occupied = (col: number, row: number) =>
      surfaces.some(
        (p) => col >= p.x && col < p.x + (p.w ?? 1) && row >= p.y && row < p.y + (p.h ?? 1),
      );
    if (occupied(chair.x, chair.y - 1)) return 'n';
    if (occupied(chair.x, chair.y + 1)) return 's';
    if (occupied(chair.x + 1, chair.y)) return 'e';
    if (occupied(chair.x - 1, chair.y)) return 'w';
    return 'n';
  }

  private createPropBodies(): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const prop of PROPS) {
      if (!prop.solid) continue;
      const w = (prop.w ?? 1) * TILE;
      const h = (prop.h ?? 1) * TILE;
      const body = this.add
        .rectangle(prop.x * TILE + w / 2, prop.y * TILE + h / 2, w - 4, h - 4)
        .setVisible(false);
      this.physics.add.existing(body, true);
      group.add(body);
    }
    return group;
  }

  // ------------------------------------------------------------------- signs

  private signIcon(room: OfficeRoom): SignIcon {
    switch (room.action.kind) {
      case 'resources':
        return 'folder';
      case 'meeting':
        return 'chat';
      case 'workspace':
        return 'desk';
      case 'notifications':
        return 'bell';
      default:
        if (room.key === 'reception' || room.key === 'hr-zone') return 'person';
        if (room.key === 'product-zone' || room.key === 'executive-room') return 'star';
        if (room.key.startsWith('meeting')) return 'chat';
        return 'chart';
    }
  }

  /**
   * Dark name plates hung above each room's back wall. They sit above the
   * sorted layers: a sign is wayfinding, and must never be hidden by a desk.
   */
  private placeRoomSigns(): void {
    for (const room of ROOMS) {
      const anchor = toScreen(room.x + Math.min(2.2, room.w / 2), room.y + 0.2);
      const lift = room.y <= 1 ? 92 : 58;
      const container = this.add.container(anchor.x, anchor.y - lift).setDepth(DEPTH_SIGNS);

      const name = this.add.text(30, 7, this.labels.room(room), {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: PALETTE.signInk,
        fontStyle: 'bold',
      });
      name.setResolution(2);
      const hint =
        room.action.kind !== 'info'
          ? this.add
              .text(30, 23, `▸ ${this.labels.action(room)}`, {
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                fontSize: '10px',
                color: PALETTE.labelHint,
              })
              .setResolution(2)
          : null;

      const width = Math.max(name.width, hint?.width ?? 0) + 42;
      const height = hint ? 40 : 28;
      const plate = this.add.graphics();
      plate.fillStyle(0x000000, 0.25);
      plate.fillRoundedRect(2, 3, width, height, 7);
      plate.fillStyle(PALETTE.signPlate, 0.94);
      plate.fillRoundedRect(0, 0, width, height, 7);
      plate.lineStyle(1, 0xffffff, 0.14);
      plate.strokeRoundedRect(0.5, 0.5, width - 1, height - 1, 7);
      // Hanging wires.
      plate.lineStyle(1, 0x0f1729, 0.5);
      plate.lineBetween(10, 0, 10, -10);
      plate.lineBetween(width - 10, 0, width - 10, -10);

      const iconBg = this.add.graphics();
      iconBg.fillStyle(0xffffff, 0.12);
      iconBg.fillRoundedRect(7, 6, 18, 18, 5);
      const icon = this.add.graphics({ x: 9, y: 8 });
      drawSignIcon(icon, this.signIcon(room));

      container.add([plate, iconBg, icon, name, ...(hint ? [hint] : [])]);
      container.setPosition(Math.round(anchor.x - width / 2), Math.round(anchor.y - lift));
    }
  }

  // -------------------------------------------------------------- characters

  private lookFor(npc: OfficeNpc, index: number): Look {
    return {
      shirt: 0xffffff,
      jacket: shade(npc.color, 0.7),
      tie: npc.personaKey ? shade(npc.color, 1.35) : undefined,
      pants: 0x2b2f3a,
      hair: PALETTE.hair[(index + 1) % PALETTE.hair.length],
      skin: PALETTE.skin,
      long: npc.key === 'npc-sales-manager',
    };
  }

  /**
   * A character frame, baked once at 2×: feet at (24, 62) in a 48×70 frame.
   * Walking swaps textures rather than redrawing anything.
   */
  private personTexture(id: string, look: Look, direction: Direction, frame: number): string {
    const key = `person:${id}:${direction}:${frame}`;
    if (this.textures.exists(key)) return key;
    const texture = this.textures.createCanvas(key, PERSON_W * PIECE_RES, PERSON_H * PIECE_RES);
    if (!texture) return key;
    const ctx = texture.getContext();
    ctx.scale(PIECE_RES, PIECE_RES);
    ctx.translate(PERSON_W / 2, PERSON_FEET);
    if (direction === 'left') ctx.scale(-1, 1);
    const view: View = direction === 'up' ? 'back' : direction === 'down' ? 'front' : 'side';
    drawPerson(ctx, look, view, frame);
    texture.refresh();
    return key;
  }

  private personImage(key: string): Phaser.GameObjects.Image {
    return this.add
      .image(0, 0, key)
      .setOrigin(0.5, PERSON_FEET / PERSON_H)
      .setScale(1 / PIECE_RES);
  }

  private createNpcs(): void {
    NPCS.forEach((npc, index) => {
      const at = tileCenter(npc.x, npc.y);
      const container = this.add
        .container(at.x, at.y)
        .setDepth(depthAt(npc.x + 0.5, npc.y + 0.5));

      // A soft ring on the floor marks someone you can talk to.
      const ring = this.add.ellipse(0, 0, 46, 22, npc.color, 0.18);
      ring.setStrokeStyle(1.5, npc.color, 0.6);
      this.tweens.add({
        targets: ring,
        scale: { from: 0.85, to: 1.12 },
        alpha: { from: 0.9, to: 0.35 },
        duration: 1700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const body = this.personImage(this.personTexture(npc.key, this.lookFor(npc, index), 'down', 0));

      const name = this.add
        .text(0, 8, npc.name, {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '10px',
          color: PALETTE.nameInk,
          backgroundColor: '#ffffffee',
          padding: { x: 5, y: 2 },
        })
        .setOrigin(0.5, 0)
        .setResolution(2);

      container.add([ring, body, name]);

      // A small idle bob keeps the office from feeling like a static diagram.
      this.tweens.add({
        targets: body,
        scaleY: { from: 1 / PIECE_RES, to: 1.02 / PIECE_RES },
        duration: 1400 + index * 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private createPlayer(): void {
    const mover = this.add
      .rectangle(toPixels(SPAWN.x), toPixels(SPAWN.y), PLAYER_SIZE, PLAYER_SIZE)
      .setVisible(false);
    this.physics.add.existing(mover);
    this.mover = mover as typeof this.mover;
    this.mover.body.setCollideWorldBounds(true);

    // The tile the player stands on glows, as in the reference office.
    this.tileGlow = this.add.graphics().setDepth(DEPTH_TILE_GLOW);
    const tile = [
      { x: 0, y: -16 },
      { x: 32, y: 0 },
      { x: 0, y: 16 },
      { x: -32, y: 0 },
    ];
    this.tileGlow.fillStyle(PALETTE.tileGlow, 0.22);
    this.tileGlow.fillPoints(tile, true);
    this.tileGlow.lineStyle(2, PALETTE.tileGlow, 0.95);
    this.tileGlow.strokePoints(tile, true);
    this.tweens.add({
      targets: this.tileGlow,
      alpha: { from: 1, to: 0.55 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.avatar = this.add.container(0, 0);
    this.avatarBody = this.personImage(this.personTexture('player', this.playerLook(), 'down', 0));

    const label = this.add
      .text(0, 7, this.labels.you, {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#2563eb',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 0)
      .setResolution(2);

    this.avatar.add([this.avatarBody, label]);
  }

  private playerLook(): Look {
    return {
      shirt: PALETTE.player,
      pants: PALETTE.pants,
      hair: PALETTE.hair[0],
      skin: PALETTE.skin,
    };
  }

  /**
   * The in-world prompts: a speech bubble naming whoever is close enough to
   * talk to, or a floating keycap over the player inside an interactive room.
   */
  private createBubbles(): void {
    const keycap = this.add.container(0, 0).setDepth(DEPTH_BUBBLES).setVisible(false);
    const cap = this.add.graphics();
    cap.fillStyle(0x0f1729, 0.3);
    cap.fillRoundedRect(-10, -9, 22, 22, 5);
    cap.fillStyle(PALETTE.signPlate, 1);
    cap.fillRoundedRect(-11, -11, 22, 22, 5);
    cap.lineStyle(1.5, PALETTE.tileGlow, 1);
    cap.strokeRoundedRect(-11, -11, 22, 22, 5);
    const letter = this.add
      .text(0, 0, 'E', {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setResolution(2);
    keycap.add([cap, letter]);
    this.tweens.add({
      targets: [cap, letter],
      y: '-=3',
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.keycap = keycap;

    this.speech = this.add.container(0, 0).setDepth(DEPTH_BUBBLES).setVisible(false);
    this.speechBg = this.add.graphics();
    this.speechName = this.add
      .text(10, 7, '', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '10px',
        color: '#2563eb',
        fontStyle: 'bold',
      })
      .setResolution(2);
    this.speechRole = this.add
      .text(10, 21, '', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '11px',
        color: PALETTE.nameInk,
      })
      .setResolution(2);
    this.speech.add([this.speechBg, this.speechName, this.speechRole]);
  }

  private showSpeech(npc: OfficeNpc): void {
    if (this.speechFor !== npc.key) {
      this.speechFor = npc.key;
      this.speechName.setText(npc.name);
      this.speechRole.setText(this.labels.role(npc));
      const width = Math.max(this.speechName.width, this.speechRole.width) + 20;
      const height = 40;
      const g = this.speechBg;
      g.clear();
      g.fillStyle(0x0f1729, 0.18);
      g.fillRoundedRect(2, 3, width, height, 8);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, width, height, 8);
      g.fillTriangle(width / 2 - 7, height - 1, width / 2 + 7, height - 1, width / 2, height + 8);
      g.lineStyle(1, 0xd2d9e6, 1);
      g.strokeRoundedRect(0.5, 0.5, width - 1, height - 1, 8);
      this.speech.setSize(width, height);
    }
    const at = tileCenter(npc.x, npc.y);
    this.speech.setPosition(Math.round(at.x - this.speech.width / 2), Math.round(at.y - 104));
    this.speech.setVisible(true);
  }

  // ------------------------------------------------------------------ update

  update(time: number, delta: number): void {
    if (!this.mover) return;
    this.handleMovement(delta);
    this.updateProximity();
  }

  /**
   * Keys move the player relative to the *screen*, not the grid: "up" walks
   * towards the back of the office. On the grid that is a diagonal, so a pair
   * of keys (up + right) is what walks straight along a corridor.
   */
  private handleMovement(delta: number): void {
    const body = this.mover.body;
    const left = this.cursors?.left.isDown || this.keys?.A.isDown;
    const right = this.cursors?.right.isDown || this.keys?.D.isDown;
    const up = this.cursors?.up.isDown || this.keys?.W.isDown;
    const down = this.cursors?.down.isDown || this.keys?.S.isDown;

    let vx = 0;
    let vy = 0;
    if (up) { vx -= 1; vy -= 1; }
    if (down) { vx += 1; vy += 1; }
    if (left) { vx -= 1; vy += 1; }
    if (right) { vx += 1; vy -= 1; }

    const length = Math.hypot(vx, vy);
    if (length > 0) {
      vx /= length;
      vy /= length;
    }
    body.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);

    const facing: Direction | null =
      up && !down ? 'up' : down && !up ? 'down' : left && !right ? 'left' : right && !left ? 'right' : null;
    const moving = length > 0;
    if (moving) this.walkPhase += delta * 0.009;
    else this.walkPhase = 0;

    if ((facing && facing !== this.facing) || moving || this.wasMoving) {
      if (facing) this.facing = facing;
      const frame = moving ? Math.floor(this.walkPhase) % 4 : 0;
      this.avatarBody.setTexture(this.personTexture('player', this.playerLook(), this.facing, frame));
    }
    this.wasMoving = moving;
  }

  /** Places the avatar where the logical body is, and sorts it into the scene. */
  private syncAvatar(): void {
    const tileX = this.mover.x / TILE;
    const tileY = this.mover.y / TILE;
    const at = toScreen(tileX, tileY);
    this.avatar.setPosition(at.x, at.y);
    this.avatar.setDepth(depthAt(tileX, tileY));

    const glow = tileCenter(Math.floor(tileX), Math.floor(tileY));
    this.tileGlow.setPosition(glow.x, glow.y);

    if (this.keycap.visible && !this.nearbyNpc) {
      this.keycap.setPosition(at.x, at.y - 74);
    }
  }

  private updateProximity(): void {
    const { x, y } = this.mover;
    const room = this.roomAt(x, y);
    if ((room?.key ?? null) !== this.currentRoomKey) {
      this.currentRoomKey = room?.key ?? null;
      this.bridge.emit({ type: 'zone_changed', room: room ?? null });
    }

    const tileX = Math.floor(x / TILE);
    const tileY = Math.floor(y / TILE);
    if (tileX !== this.lastReportedTile.x || tileY !== this.lastReportedTile.y) {
      this.lastReportedTile = { x: tileX, y: tileY };
      // Throttled to tile changes — this drives the React minimap.
      this.bridge.emit({ type: 'player_moved', x: tileX, y: tileY });
    }

    let nearest: OfficeNpc | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const npc of NPCS) {
      const distance = Phaser.Math.Distance.Between(x, y, toPixels(npc.x), toPixels(npc.y));
      if (distance < NPC_INTERACT_RADIUS && distance < nearestDistance) {
        nearest = npc;
        nearestDistance = distance;
      }
    }
    this.nearbyNpc = nearest;

    const action = nearest
      ? this.labels.talk
      : room && room.action.kind !== 'info'
        ? this.labels.action(room)
        : null;
    const target = nearest ? nearest.name : null;
    const prompt = action
      ? target
        ? this.labels.promptTarget(action, target)
        : this.labels.promptZone(action)
      : null;

    if (nearest) {
      this.showSpeech(nearest);
      this.keycap.setVisible(false);
    } else {
      this.speech.setVisible(false);
      this.speechFor = null;
      this.keycap.setVisible(!!(room && room.action.kind !== 'info'));
    }

    if (prompt !== this.currentPrompt) {
      this.currentPrompt = prompt;
      this.bridge.emit({ type: 'prompt', text: prompt, action, target });
    }
  }

  private handleInteract(): void {
    if (this.nearbyNpc) {
      this.bridge.emit({ type: 'interact_npc', npc: this.nearbyNpc });
      return;
    }
    const room = this.roomAt(this.mover.x, this.mover.y);
    if (room && room.action.kind !== 'info') {
      this.bridge.emit({ type: 'interact_zone', room });
    }
  }

  private roomAt(x: number, y: number): OfficeRoom | undefined {
    return this.roomAtTile(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  private roomAtTile(col: number, row: number): OfficeRoom | undefined {
    return ROOMS.find(
      (room) =>
        col >= room.x &&
        col < room.x + room.w &&
        row >= room.y &&
        row < room.y + room.h,
    );
  }
}
