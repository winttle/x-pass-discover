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
import { PALETTE } from './theme';
import type { OfficeBridge } from './bridge';

const PLAYER_SPEED = 215;
const NPC_INTERACT_RADIUS = 60;
const CAMERA_ZOOM = 1.15;
const WALL_HEIGHT = 8;

type WallRun = { px: number; py: number; width: number };

/**
 * The BITE office scene.
 *
 * Owns movement, collisions, room zones, NPC positions and proximity prompts.
 * It holds no business state: every meaningful interaction is emitted to React
 * through the bridge.
 *
 * Everything is drawn procedurally from `map.ts` — floors, walls with a faked
 * height, furniture and characters — so the office needs no art pipeline and a
 * new room is a data change, not an asset request.
 */
export class OfficeScene extends Phaser.Scene {
  private bridge: OfficeBridge;
  private player!: Phaser.GameObjects.Container & {
    body: Phaser.Physics.Arcade.Body;
  };
  private playerBody!: Phaser.GameObjects.Graphics;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private currentRoomKey: string | null = null;
  private currentPrompt: string | null = null;
  private nearbyNpc: OfficeNpc | null = null;
  private promptBubble!: Phaser.GameObjects.Container;
  private facing: 'up' | 'down' | 'left' | 'right' = 'down';
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
    return this.player;
  }

  /**
   * Bakes a static layer into a texture.
   *
   * A Phaser Graphics object re-submits every one of its draw commands on every
   * frame. The floor alone is ~1,400 tile fills plus the grid, which is enough
   * to drag the frame rate down hard. These layers never change, so they are
   * drawn once into a texture and displayed as a single image.
   */
  private bake(
    key: string,
    depth: number,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    if (this.textures.exists(key)) this.textures.remove(key);
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, WORLD_WIDTH, WORLD_HEIGHT);
    g.destroy();
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(depth);
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(PALETTE.void);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    this.cameras.main.setRoundPixels(true);

    // Floor, wall shadows, furniture and walls are all static and nothing
    // dynamic is drawn between them, so they bake into ONE image instead of
    // four full-world layers composited every frame.
    const wallRuns = this.computeWallRuns();
    this.bake('office-static', 0, (g) => {
      this.paintFloors(g);
      this.paintWallShadows(g, wallRuns);
      this.paintProps(g);
      this.paintWalls(g, wallRuns);
    });

    const obstacles = this.createPropBodies();
    const walls = this.createWallBodies(wallRuns);
    this.drawRoomLabels();
    this.createNpcs();
    this.createPlayer();
    this.createPromptBubble();

    this.physics.add.collider(this.player, walls);
    this.physics.add.collider(this.player, obstacles);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.keys = keyboard.addKeys('W,A,S,D') as NonNullable<typeof this.keys>;
      keyboard.on('keydown-E', () => this.handleInteract());
      // Arrow keys would otherwise scroll the page behind the canvas.
      keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    }

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(120, 90);
    this.cameras.main.fadeIn(420, 5, 7, 14);

    this.bridge.emit({ type: 'ready' });
  }

  // ------------------------------------------------------------------ floors

  private paintFloors(g: Phaser.GameObjects.Graphics): void {
    const tileFloor = (
      x: number,
      y: number,
      w: number,
      h: number,
      base: number,
      alt: number,
    ) => {
      for (let row = y; row < y + h; row += 1) {
        for (let col = x; col < x + w; col += 1) {
          g.fillStyle((col + row) % 2 === 0 ? base : alt, 1);
          g.fillRect(col * TILE, row * TILE, TILE, TILE);
        }
      }
    };

    for (const corridor of CORRIDORS) {
      tileFloor(
        corridor.x,
        corridor.y,
        corridor.w,
        corridor.h,
        PALETTE.corridor,
        PALETTE.corridorAlt,
      );
    }

    for (const room of ROOMS) {
      // Room colours are tinted toward the corridor so they read as one office.
      const base = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(PALETTE.corridor),
        Phaser.Display.Color.ValueToColor(room.color),
        100,
        48,
      );
      const baseColor = Phaser.Display.Color.GetColor(base.r, base.g, base.b);
      const altColor = Phaser.Display.Color.GetColor(
        Math.min(255, base.r + 7),
        Math.min(255, base.g + 8),
        Math.min(255, base.b + 12),
      );
      tileFloor(room.x, room.y, room.w, room.h, baseColor, altColor);

      // A soft accent band along the room's inner edge.
      g.lineStyle(2, room.color, 0.75);
      g.strokeRect(
        room.x * TILE + 1,
        room.y * TILE + 1,
        room.w * TILE - 2,
        room.h * TILE - 2,
      );
    }

    // Subtle tile grid across the whole floor ties the rooms together.
    g.lineStyle(1, PALETTE.grid, 0.3);
    for (let col = 0; col <= GRID_WIDTH; col += 1) {
      g.lineBetween(col * TILE, 0, col * TILE, WORLD_HEIGHT);
    }
    for (let row = 0; row <= GRID_HEIGHT; row += 1) {
      g.lineBetween(0, row * TILE, WORLD_WIDTH, row * TILE);
    }

    // Doorways: lit threshold so openings are obvious from a distance.
    for (const room of ROOMS) {
      for (const door of room.doors) {
        g.fillStyle(PALETTE.doorway, 1);
        g.fillRect(door.x * TILE, door.y * TILE, TILE, TILE);
        g.fillStyle(PALETTE.threshold, 0.28);
        g.fillRect(door.x * TILE + 4, door.y * TILE + TILE / 2 - 2, TILE - 8, 4);
      }
    }
  }

  // ------------------------------------------------------------------- walls

  /**
   * Merges each row's wall tiles into horizontal runs — a few dozen physics
   * bodies instead of several hundred one-tile ones, and far fewer draw calls.
   */
  private computeWallRuns(): WallRun[] {
    const grid = buildWallGrid();
    const runs: WallRun[] = [];
    for (let row = 0; row < GRID_HEIGHT; row += 1) {
      let runStart: number | null = null;
      for (let col = 0; col <= GRID_WIDTH; col += 1) {
        const isWall = col < GRID_WIDTH && grid[row][col];
        if (isWall && runStart === null) runStart = col;
        if (!isWall && runStart !== null) {
          runs.push({
            px: runStart * TILE,
            py: row * TILE,
            width: (col - runStart) * TILE,
          });
          runStart = null;
        }
      }
    }

    return runs;
  }

  private paintWallShadows(g: Phaser.GameObjects.Graphics, runs: WallRun[]): void {
    g.fillStyle(PALETTE.wallShadow, 0.5);
    for (const run of runs) g.fillRect(run.px + 2, run.py + TILE, run.width, 7);
  }

  private paintWalls(g: Phaser.GameObjects.Graphics, runs: WallRun[]): void {
    for (const { px, py, width } of runs) {
      // Front face, then the lit top face above it.
      g.fillStyle(PALETTE.wallFace, 1);
      g.fillRect(px, py, width, TILE);
      g.fillStyle(0x000000, 0.22);
      g.fillRect(px, py + TILE - 9, width, 9);
      g.fillStyle(PALETTE.wallTop, 1);
      g.fillRect(px, py - WALL_HEIGHT, width, WALL_HEIGHT);
      g.lineStyle(1.5, PALETTE.wallEdge, 0.9);
      g.lineBetween(px, py - WALL_HEIGHT, px + width, py - WALL_HEIGHT);
      g.lineStyle(1, PALETTE.wallEdge, 0.3);
      g.lineBetween(px, py + TILE, px + width, py + TILE);
    }
  }

  private createWallBodies(runs: WallRun[]): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const { px, py, width } of runs) {
      const rect = this.add.rectangle(
        px + width / 2,
        py + TILE / 2,
        width,
        TILE,
        0,
        0,
      );
      this.physics.add.existing(rect, true);
      group.add(rect);
    }

    return group;
  }

  // --------------------------------------------------------------- furniture

  private paintProps(g: Phaser.GameObjects.Graphics): void {
    for (const prop of PROPS) {
      const w = (prop.w ?? 1) * TILE;
      const h = (prop.h ?? 1) * TILE;
      const x = prop.x * TILE;
      const y = prop.y * TILE;

      if (prop.solid) {
        g.fillStyle(PALETTE.propShadow, 0.42);
        g.fillRoundedRect(x + 3, y + 5, w - 2, h - 2, 6);
      }
      this.drawProp(g, prop, x, y, w, h);
    }
  }

  private createPropBodies(): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const prop of PROPS) {
      if (!prop.solid) continue;
      const w = (prop.w ?? 1) * TILE;
      const h = (prop.h ?? 1) * TILE;
      const body = this.add.rectangle(
        prop.x * TILE + w / 2,
        prop.y * TILE + h / 2,
        w - 4,
        h - 4,
        0,
        0,
      );
      this.physics.add.existing(body, true);
      group.add(body);
    }

    return group;
  }

  private drawProp(
    g: Phaser.GameObjects.Graphics,
    prop: OfficeProp,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const inset = 3;
    switch (prop.kind) {
      case 'rug': {
        g.fillStyle(prop.accent ?? PALETTE.rug, 0.07);
        g.fillRoundedRect(x + 4, y + 4, w - 8, h - 8, 10);
        g.lineStyle(1, prop.accent ?? PALETTE.rug, 0.16);
        g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, 10);
        break;
      }

      case 'desk': {
        g.fillStyle(PALETTE.deskEdge, 1);
        g.fillRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2, 5);
        g.fillStyle(prop.accent ?? PALETTE.deskTop, 1);
        g.fillRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2 - 4, 5);
        if (prop.monitor) {
          const mx = x + w / 2 - 9;
          const my = y + inset + 4;
          g.fillStyle(PALETTE.monitor, 1);
          g.fillRoundedRect(mx, my, 18, 12, 2);
          g.fillStyle(PALETTE.monitorGlow, 0.55);
          g.fillRoundedRect(mx + 2, my + 2, 14, 8, 1);
        }
        break;
      }

      case 'table': {
        g.fillStyle(PALETTE.deskEdge, 1);
        g.fillRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2, 10);
        g.fillStyle(PALETTE.tableTop, 1);
        g.fillRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2 - 5, 10);
        break;
      }

      case 'counter': {
        g.fillStyle(PALETTE.deskEdge, 1);
        g.fillRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2, 6);
        g.fillStyle(PALETTE.counterTop, 1);
        g.fillRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2 - 5, 6);
        g.lineStyle(1, PALETTE.wallEdge, 0.5);
        g.strokeRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2 - 5, 6);
        break;
      }

      case 'shelf': {
        g.fillStyle(PALETTE.shelfBody, 1);
        g.fillRoundedRect(x + inset, y + inset, w - inset * 2, h - inset * 2, 3);
        g.lineStyle(2, PALETTE.shelfLine, 0.75);
        for (let i = 1; i <= 3; i += 1) {
          const ly = y + inset + ((h - inset * 2) / 4) * i;
          g.lineBetween(x + inset + 3, ly, x + w - inset - 3, ly);
        }
        break;
      }

      case 'server': {
        g.fillStyle(PALETTE.serverBody, 1);
        g.fillRoundedRect(x + 6, y + 3, w - 12, h - 6, 3);
        for (let i = 0; i < 4; i += 1) {
          g.fillStyle(PALETTE.serverLed, i % 2 === 0 ? 0.9 : 0.4);
          g.fillRect(x + 9, y + 8 + i * 5, 4, 2);
        }
        break;
      }

      case 'sofa': {
        g.fillStyle(PALETTE.sofaBody, 1);
        g.fillRoundedRect(x + inset, y + inset + 4, w - inset * 2, h - inset * 2 - 4, 7);
        g.fillStyle(PALETTE.sofaBody, 0.72);
        g.fillRoundedRect(x + inset, y + inset, w - inset * 2, 10, 5);
        break;
      }

      case 'chair': {
        g.fillStyle(PALETTE.chairBody, 1);
        g.fillRoundedRect(x + 9, y + 9, w - 18, h - 18, 5);
        break;
      }

      case 'plant': {
        g.fillStyle(PALETTE.plantPot, 1);
        g.fillRoundedRect(x + 11, y + 19, 10, 9, 2);
        g.fillStyle(PALETTE.plantLeaf, 1);
        g.fillCircle(x + 16, y + 13, 7);
        g.fillCircle(x + 11, y + 17, 5);
        g.fillCircle(x + 21, y + 17, 5);
        break;
      }

      case 'board': {
        g.fillStyle(PALETTE.boardBody, 1);
        g.fillRoundedRect(x + 4, y + 6, w - 8, h - 14, 3);
        g.lineStyle(1, PALETTE.boardInk, 0.55);
        for (let i = 1; i <= 3; i += 1) {
          const ly = y + 6 + ((h - 14) / 4) * i;
          g.lineBetween(x + 8, ly, x + w - 8 - (i % 2 === 0 ? 10 : 0), ly);
        }
        break;
      }

      case 'screen': {
        g.fillStyle(PALETTE.monitor, 1);
        g.fillRoundedRect(x + 5, y + 6, w - 10, h - 14, 3);
        g.fillStyle(PALETTE.screenGlow, 0.35);
        g.fillRoundedRect(x + 8, y + 9, w - 16, h - 20, 2);
        break;
      }

      default:
        break;
    }
  }

  // ------------------------------------------------------------------ labels

  private drawRoomLabels(): void {
    for (const room of ROOMS) {
      const x = room.x * TILE + 9;
      const y = room.y * TILE + 7;

      const label = this.add.text(x, y, room.name.toUpperCase(), {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '10px',
        color: PALETTE.labelInk,
        fontStyle: 'bold',
      });
      label.setLetterSpacing(1.2);
      label.setDepth(5);
      label.setAlpha(0.8);

      if (room.action.kind !== 'info') {
        const hint = this.add.text(x, y + 14, `▸ ${room.action.label}`, {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '10px',
          color: PALETTE.labelHint,
        });
        hint.setDepth(5);
      }
    }
  }

  // -------------------------------------------------------------- characters

  private createNpcs(): void {
    for (const npc of NPCS) {
      const x = toPixels(npc.x);
      const y = toPixels(npc.y);
      const container = this.add.container(x, y).setDepth(10);

      const shadow = this.add.ellipse(0, 11, 22, 8, PALETTE.shadow, 0.42);

      const ring = this.add.circle(0, 0, 20, npc.color, 0.16);
      this.tweens.add({
        targets: ring,
        scale: { from: 0.8, to: 1.2 },
        alpha: { from: 0.28, to: 0.05 },
        duration: 1900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const body = this.add.graphics();
      this.drawCharacter(body, npc.color, 'down');

      const initials = this.add.text(0, -9, npc.name.slice(0, 1), {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '10px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      initials.setOrigin(0.5);

      const name = this.add.text(0, 20, npc.name, {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '10px',
        color: PALETTE.nameInk,
        backgroundColor: '#0b1222cc',
        padding: { x: 5, y: 2 },
      });
      name.setOrigin(0.5, 0);

      container.add([shadow, ring, body, initials, name]);

      // A small idle bob keeps the office from feeling like a static diagram.
      this.tweens.add({
        targets: [body, initials],
        y: '+=2',
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** A simple top-down figure: head, shoulders and a facing indicator. */
  private drawCharacter(
    g: Phaser.GameObjects.Graphics,
    color: number,
    facing: 'up' | 'down' | 'left' | 'right',
  ): void {
    g.clear();

    g.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(28).color, 1);
    g.fillRoundedRect(-10, -4, 20, 18, 7);

    g.fillStyle(color, 1);
    g.fillRoundedRect(-10, -12, 20, 20, 8);

    g.fillStyle(0xffffff, 0.14);
    g.fillRoundedRect(-8, -10, 16, 7, 4);

    // Facing nub — small, but it makes the avatar feel steered rather than slid.
    const offsets = {
      up: [0, -14],
      down: [0, 12],
      left: [-13, 0],
      right: [13, 0],
    } as const;
    const [ox, oy] = offsets[facing];
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(ox, oy, 2.6);
  }

  private createPlayer(): void {
    const container = this.add
      .container(toPixels(SPAWN.x), toPixels(SPAWN.y))
      .setDepth(12);

    const shadow = this.add.ellipse(0, 12, 24, 9, PALETTE.shadow, 0.5);

    const glow = this.add.circle(0, 0, 22, PALETTE.player, 0.14);
    this.tweens.add({
      targets: glow,
      scale: { from: 0.9, to: 1.12 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.playerBody = this.add.graphics();
    this.drawCharacter(this.playerBody, PALETTE.player, 'down');

    const label = this.add.text(0, 21, 'You', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#1d4ed8cc',
      padding: { x: 5, y: 2 },
    });
    label.setOrigin(0.5, 0);

    container.add([shadow, glow, this.playerBody, label]);
    this.physics.add.existing(container);

    this.player = container as typeof this.player;
    this.player.body.setSize(22, 22);
    this.player.body.setOffset(-11, -8);
    this.player.body.setCollideWorldBounds(true);
  }

  /** Floating keycap above whatever the player can interact with right now. */
  private createPromptBubble(): void {
    const container = this.add.container(0, 0).setDepth(20).setVisible(false);

    const key = this.add.text(0, 0, 'E', {
      fontFamily: 'ui-monospace, monospace',
      fontSize: '11px',
      color: '#0b1222',
      backgroundColor: '#e8eefc',
      padding: { x: 6, y: 3 },
    });
    key.setOrigin(0.5);

    container.add(key);
    this.tweens.add({
      targets: container,
      y: '-=4',
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.promptBubble = container;
  }

  // ------------------------------------------------------------------ update

  update(): void {
    if (!this.player) return;
    this.handleMovement();
    this.updateProximity();
  }

  private handleMovement(): void {
    const body = this.player.body;
    const left = this.cursors?.left.isDown || this.keys?.A.isDown;
    const right = this.cursors?.right.isDown || this.keys?.D.isDown;
    const up = this.cursors?.up.isDown || this.keys?.W.isDown;
    const down = this.cursors?.down.isDown || this.keys?.S.isDown;

    let vx = 0;
    let vy = 0;
    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    if (vx !== 0 && vy !== 0) {
      // Keep diagonal movement the same speed as cardinal.
      const inv = Math.SQRT1_2;
      vx *= inv;
      vy *= inv;
    }

    body.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);

    const facing =
      vy < 0 ? 'up' : vy > 0 ? 'down' : vx < 0 ? 'left' : vx > 0 ? 'right' : null;
    if (facing && facing !== this.facing) {
      this.facing = facing;
      this.drawCharacter(this.playerBody, PALETTE.player, facing);
    }
  }

  private updateProximity(): void {
    const room = this.roomAt(this.player.x, this.player.y);
    if ((room?.key ?? null) !== this.currentRoomKey) {
      this.currentRoomKey = room?.key ?? null;
      this.bridge.emit({ type: 'zone_changed', room: room ?? null });
    }

    const tileX = Math.floor(this.player.x / TILE);
    const tileY = Math.floor(this.player.y / TILE);
    if (tileX !== this.lastReportedTile.x || tileY !== this.lastReportedTile.y) {
      this.lastReportedTile = { x: tileX, y: tileY };
      // Throttled to tile changes — this drives the React minimap.
      this.bridge.emit({ type: 'player_moved', x: tileX, y: tileY });
    }

    let nearest: OfficeNpc | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const npc of NPCS) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        toPixels(npc.x),
        toPixels(npc.y),
      );
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
      this.promptBubble.setVisible(true);
      this.promptBubble.setPosition(toPixels(nearest.x), toPixels(nearest.y) - 30);
    } else if (room && room.action.kind !== 'info') {
      this.promptBubble.setVisible(true);
      this.promptBubble.setPosition(this.player.x, this.player.y - 32);
    } else {
      this.promptBubble.setVisible(false);
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
    const room = this.roomAt(this.player.x, this.player.y);
    if (room && room.action.kind !== 'info') {
      this.bridge.emit({ type: 'interact_zone', room });
    }
  }

  private roomAt(x: number, y: number): OfficeRoom | undefined {
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    return ROOMS.find(
      (room) =>
        col >= room.x &&
        col < room.x + room.w &&
        row >= room.y &&
        row < room.y + room.h,
    );
  }
}
