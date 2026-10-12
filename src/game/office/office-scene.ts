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
  buildWallGrid,
  toPixels,
  type OfficeNpc,
  type OfficeProp,
  type OfficeRoom,
} from './map';
import {
  ISO_WORLD_HEIGHT,
  ISO_WORLD_WIDTH,
  depthAt,
  tileCenter,
  toScreen,
} from './iso';
import {
  chairPiece,
  counterPiece,
  deskPiece,
  drawCharacter,
  drawSignIcon,
  panelPiece,
  plantPiece,
  serverPiece,
  shade,
  shelfPiece,
  sofaPiece,
  tablePiece,
  wallPiece,
  type Edges,
  type Facing,
  type Look,
  type Piece,
  type SignIcon,
  type WallKind,
} from './art';
import { FLOORS, PALETTE, type FloorMaterial } from './theme';
import type { OfficeBridge } from './bridge';

const PLAYER_SPEED = 215;
const NPC_INTERACT_RADIUS = 60;
const CAMERA_ZOOM = 1.3;
const PLAYER_SIZE = 22;

/** Layers that never sort against the player. */
const DEPTH_FLOOR = -10;
const DEPTH_TILE_GLOW = -5;
const DEPTH_SIGNS = 5_000;
const DEPTH_BUBBLES = 6_000;

const WALL_HEIGHTS: Record<WallKind, number> = { back: 120, low: 24, glass: 12 };

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
  private avatarBody!: Phaser.GameObjects.Graphics;
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

  constructor(bridge: OfficeBridge) {
    super('office');
    this.bridge = bridge;
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
   * The floor is flat, so all of it — tiles, rugs, door thresholds and the
   * building's slab edge — is baked into one texture. A Phaser Graphics object
   * re-submits every draw command every frame; an image costs one quad.
   */
  private paintFloor(walls: boolean[][]): void {
    const key = 'office-floor';
    if (this.textures.exists(key)) this.textures.remove(key);
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    const diamond = (x0: number, y0: number, x1: number, y1: number) => [
      toScreen(x0, y0),
      toScreen(x1, y0),
      toScreen(x1, y1),
      toScreen(x0, y1),
    ];

    // The building's slab: its two front edges drop away into the night.
    const slab = 22;
    const sw = toScreen(0, GRID_HEIGHT);
    const se = toScreen(GRID_WIDTH, GRID_HEIGHT);
    const ne = toScreen(GRID_WIDTH, 0);
    g.fillStyle(0x3a4256, 1);
    g.fillPoints([sw, se, { x: se.x, y: se.y + slab }, { x: sw.x, y: sw.y + slab }], true);
    g.fillStyle(0x2c3344, 1);
    g.fillPoints([se, ne, { x: ne.x, y: ne.y + slab }, { x: se.x, y: se.y + slab }], true);

    const materialAt = this.floorMaterials(walls);
    for (let row = 0; row < GRID_HEIGHT; row += 1) {
      for (let col = 0; col < GRID_WIDTH; col += 1) {
        const material = materialAt[row][col];
        if (!material) {
          // Under a wall. Never seen, except through glass.
          g.fillStyle(PALETTE.partition, 1);
          g.fillPoints(diamond(col, row, col + 1, row + 1), true);
          continue;
        }
        this.paintTile(g, col, row, material);
      }
    }

    // Rugs lie flat, so they belong to the floor rather than to the sorted props.
    for (const prop of PROPS) {
      if (prop.kind !== 'rug') continue;
      const w = prop.w ?? 1;
      const h = prop.h ?? 1;
      const room = this.roomAtTile(prop.x, prop.y);
      const color = prop.accent ?? (room?.key === 'my-desk' ? 0x3b82f6 : 0x8d9bb3);
      g.fillStyle(color, room?.key === 'my-desk' ? 0.22 : 0.3);
      g.fillPoints(diamond(prop.x + 0.15, prop.y + 0.15, prop.x + w - 0.15, prop.y + h - 0.15), true);
      g.lineStyle(2, shade(color, 1.4), 0.6);
      g.strokePoints(
        diamond(prop.x + 0.3, prop.y + 0.3, prop.x + w - 0.3, prop.y + h - 0.3),
        true,
      );
    }

    // Doorways: a lit threshold so openings read from across the room.
    for (const room of ROOMS) {
      for (const door of room.doors) {
        g.fillStyle(PALETTE.threshold, 0.35);
        g.fillPoints(diamond(door.x + 0.15, door.y + 0.15, door.x + 0.85, door.y + 0.85), true);
      }
    }

    g.generateTexture(key, ISO_WORLD_WIDTH, ISO_WORLD_HEIGHT);
    g.destroy();
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(DEPTH_FLOOR);
  }

  private floorMaterials(walls: boolean[][]): Array<Array<FloorMaterial | null>> {
    const grid: Array<Array<FloorMaterial | null>> = walls.map((row) =>
      row.map((isWall) => (isWall ? null : PALETTE.corridor)),
    );
    for (const room of ROOMS) {
      for (let row = room.y; row < room.y + room.h; row += 1) {
        for (let col = room.x; col < room.x + room.w; col += 1) {
          if (grid[row]?.[col] !== undefined && !walls[row][col]) grid[row][col] = room.floor;
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

  private paintTile(
    g: Phaser.GameObjects.Graphics,
    col: number,
    row: number,
    material: FloorMaterial,
  ): void {
    const { base, alt, seam } = FLOORS[material];
    const corners = [
      toScreen(col, row),
      toScreen(col + 1, row),
      toScreen(col + 1, row + 1),
      toScreen(col, row + 1),
    ];

    let fill = base;
    if (material === 'carpet') fill = ((col >> 1) + (row >> 1)) % 2 === 0 ? base : alt;
    else if (material === 'wood' || material === 'walnut') fill = (col * 7 + row) % 3 === 0 ? alt : base;
    else fill = (col + row) % 2 === 0 ? base : alt;
    g.fillStyle(fill, 1);
    g.fillPoints(corners, true);

    g.lineStyle(1, seam, material === 'carpet' ? 0.35 : 0.6);
    if (material === 'wood' || material === 'walnut') {
      // Planks run along x; stagger their butt joints by row.
      g.lineBetween(corners[0].x, corners[0].y, corners[1].x, corners[1].y);
      const mid0 = toScreen(col, row + 0.5);
      const mid1 = toScreen(col + 1, row + 0.5);
      g.lineBetween(mid0.x, mid0.y, mid1.x, mid1.y);
      const joint = toScreen(col + ((row % 2) * 0.5 + 0.25), row);
      const jointEnd = toScreen(col + ((row % 2) * 0.5 + 0.25), row + 0.5);
      g.lineBetween(joint.x, joint.y, jointEnd.x, jointEnd.y);
    } else if (material === 'carpet') {
      if (col % 2 === 0) g.lineBetween(corners[0].x, corners[0].y, corners[3].x, corners[3].y);
      if (row % 2 === 0) g.lineBetween(corners[0].x, corners[0].y, corners[1].x, corners[1].y);
    } else {
      g.strokePoints(corners, true);
    }
  }

  // ------------------------------------------------------------------ pieces

  /** Bakes a one-tile piece once per distinct look and places it on the grid. */
  private placePiece(piece: Piece, col: number, row: number): void {
    const pad = 12;
    const width = 64 + pad * 2;
    const height = piece.height + 32 + pad * 2;
    const originX = 32 + pad;
    const originY = piece.height + 16 + pad;

    const key = `piece:${piece.key}`;
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.translateCanvas(originX, originY);
      piece.draw(g);
      g.generateTexture(key, width, height);
      g.destroy();
    }

    const at = tileCenter(col, row);
    this.add
      .image(at.x, at.y, key)
      .setOrigin(originX / width, originY / height)
      .setDepth(depthAt(col + 0.5, row + 0.5));
  }

  // ------------------------------------------------------------------- walls

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
        this.placePiece(wallPiece(kind, faces, (col * 3 + row * 5) % 8), col, row);
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
          const offset = col - prop.x + (row - prop.y);
          const piece = this.pieceFor(prop, edges, offset, index * 31 + col * 7 + row);
          if (piece) this.placePiece(piece, col, row);
        }
      }
    });
  }

  private pieceFor(prop: OfficeProp, edges: Edges, offset: number, seed: number): Piece | null {
    const w = prop.w ?? 1;
    const h = prop.h ?? 1;
    const room = this.roomAtTile(prop.x, prop.y);
    switch (prop.kind) {
      case 'desk': {
        const along = w >= h ? w : h;
        return deskPiece(edges, {
          monitor: !!prop.monitor && offset === Math.floor((along - 1) / 2),
          accent: prop.accent,
          wood: room?.floor === 'walnut' ? PALETTE.walnut : PALETTE.wood,
          clutter: seed,
        });
      }
      case 'table':
        return tablePiece(edges, {
          top: room?.floor === 'wood' ? PALETTE.tableTop : PALETTE.wood,
          laptop: !edges.n && !edges.w && (edges.s || edges.e) && seed % 2 === 0,
        });
      case 'counter':
        return counterPiece(edges);
      case 'shelf':
        return shelfPiece(edges, seed);
      case 'server':
        return serverPiece();
      case 'sofa':
        return sofaPiece(edges, edges.w);
      case 'chair':
        return chairPiece(this.chairFacing(prop), prop.occupant, seed);
      case 'plant':
        return plantPiece(seed, seed % 2 === 0);
      case 'board':
      case 'screen':
        return panelPiece(edges, {
          axis: w >= h ? 'x' : 'y',
          screen: prop.kind === 'screen',
          index: offset,
        });
      default:
        return null;
    }
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

      const name = this.add.text(30, 7, room.name, {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '12px',
        color: PALETTE.signInk,
        fontStyle: 'bold',
      });
      name.setResolution(2);
      const hint =
        room.action.kind !== 'info'
          ? this.add
              .text(30, 23, `▸ ${room.action.label}`, {
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
      jacket: shade(npc.color, 0.75),
      tie: npc.personaKey ? shade(npc.color, 1.3) : undefined,
      pants: PALETTE.pants,
      hair: PALETTE.hair[(index + 1) % PALETTE.hair.length],
      skin: PALETTE.skin,
    };
  }

  private createNpcs(): void {
    NPCS.forEach((npc, index) => {
      const at = tileCenter(npc.x, npc.y);
      const container = this.add
        .container(at.x, at.y)
        .setDepth(depthAt(npc.x + 0.5, npc.y + 0.5));

      // A soft ring on the floor marks someone you can talk to.
      const ring = this.add.ellipse(0, 0, 46, 22, npc.color, 0.22);
      ring.setStrokeStyle(1.5, npc.color, 0.55);
      this.tweens.add({
        targets: ring,
        scale: { from: 0.85, to: 1.12 },
        alpha: { from: 0.9, to: 0.35 },
        duration: 1700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const body = this.add.graphics();
      drawCharacter(body, this.lookFor(npc, index), 'down');

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
        y: '-=1.5',
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
    this.avatarBody = this.add.graphics();
    drawCharacter(this.avatarBody, this.playerLook(), 'down');

    const label = this.add
      .text(0, 7, 'You', {
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
      tie: PALETTE.playerTrim,
      jacket: undefined,
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
      this.speechRole.setText(npc.role);
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
    if (moving) this.walkPhase += delta * 0.018;
    else this.walkPhase = 0;

    if ((facing && facing !== this.facing) || moving || this.wasMoving) {
      if (facing) this.facing = facing;
      drawCharacter(this.avatarBody, this.playerLook(), this.facing, this.walkPhase);
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
      ? nearest.prompt
      : room && room.action.kind !== 'info'
        ? room.action.label
        : null;
    const target = nearest ? nearest.name : null;
    const prompt = action
      ? target
        ? `Press E to ${action} — ${target}`
        : `Press E — ${action}`
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
