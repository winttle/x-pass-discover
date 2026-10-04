import * as Phaser from 'phaser';
import {
  CORRIDORS,
  GRID_HEIGHT,
  GRID_WIDTH,
  NPCS,
  ROOMS,
  SPAWN,
  TILE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  buildCollisionGrid,
  toPixels,
  type OfficeNpc,
  type OfficeRoom,
} from './map';
import type { OfficeBridge } from './bridge';

const PLAYER_SPEED = 230;
const NPC_INTERACT_RADIUS = 56;

/**
 * The BITE office scene.
 *
 * Owns movement, collisions, room zones, NPC positions and proximity prompts.
 * It holds no business state: every meaningful interaction is emitted to React
 * through the bridge.
 */
export class OfficeScene extends Phaser.Scene {
  private bridge: OfficeBridge;
  private player!: Phaser.GameObjects.Rectangle & {
    body: Phaser.Physics.Arcade.Body;
  };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private currentRoomKey: string | null = null;
  private currentPrompt: string | null = null;
  private nearbyNpc: OfficeNpc | null = null;
  private nameLabel!: Phaser.GameObjects.Text;

  constructor(bridge: OfficeBridge) {
    super('office');
    this.bridge = bridge;
  }

  /**
   * Debug/testing handle for the avatar. The experience layer holds no business
   * state, so exposing it carries no information the player does not already
   * have on screen.
   */
  get playerRef(): Phaser.GameObjects.Rectangle {
    return this.player;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor('#080b14');

    this.drawFloors();
    const walls = this.buildWalls();
    this.drawRoomLabels();
    this.createNpcs();
    this.createPlayer();

    this.physics.add.collider(this.player, walls);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.keys = keyboard.addKeys('W,A,S,D') as typeof this.keys;
      keyboard.on('keydown-E', () => this.handleInteract());
      // Arrow keys would otherwise scroll the page behind the canvas.
      keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);
    }

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.bridge.emit({ type: 'ready' });
  }

  // ------------------------------------------------------------------ render

  private drawFloors(): void {
    const graphics = this.add.graphics();

    for (const corridor of CORRIDORS) {
      graphics.fillStyle(0x121a2b, 1);
      graphics.fillRect(
        corridor.x * TILE,
        corridor.y * TILE,
        corridor.w * TILE,
        corridor.h * TILE,
      );
    }

    for (const room of ROOMS) {
      graphics.fillStyle(room.color, 1);
      graphics.fillRect(room.x * TILE, room.y * TILE, room.w * TILE, room.h * TILE);
      graphics.lineStyle(2, 0x36456b, 0.75);
      graphics.strokeRect(room.x * TILE, room.y * TILE, room.w * TILE, room.h * TILE);

      // Doorways drawn over the room border so openings read clearly.
      graphics.fillStyle(0x121a2b, 1);
      for (const door of room.doors) {
        graphics.fillRect(door.x * TILE, door.y * TILE, TILE, TILE);
      }
    }

    graphics.setDepth(0);
  }

  /**
   * Merges each row's wall tiles into horizontal runs before creating physics
   * bodies — a few dozen bodies instead of ~400 one-tile ones.
   */
  private buildWalls(): Phaser.Physics.Arcade.StaticGroup {
    const grid = buildCollisionGrid();
    const group = this.physics.add.staticGroup();
    const graphics = this.add.graphics();
    graphics.fillStyle(0x0d1220, 1);

    for (let row = 0; row < GRID_HEIGHT; row += 1) {
      let runStart: number | null = null;
      for (let col = 0; col <= GRID_WIDTH; col += 1) {
        const isWall = col < GRID_WIDTH && grid[row][col];
        if (isWall && runStart === null) runStart = col;
        if (!isWall && runStart !== null) {
          const width = (col - runStart) * TILE;
          const x = runStart * TILE + width / 2;
          const y = row * TILE + TILE / 2;
          graphics.fillRect(runStart * TILE, row * TILE, width, TILE);
          const rect = this.add.rectangle(x, y, width, TILE, 0x0d1220, 0);
          this.physics.add.existing(rect, true);
          group.add(rect);
          runStart = null;
        }
      }
    }

    graphics.setDepth(1);
    return group;
  }

  private drawRoomLabels(): void {
    for (const room of ROOMS) {
      const label = this.add.text(
        room.x * TILE + 10,
        room.y * TILE + 8,
        room.name.toUpperCase(),
        {
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '11px',
          color: '#9fb0d4',
        },
      );
      label.setDepth(2);

      if (room.action.kind !== 'info') {
        const hint = this.add.text(
          room.x * TILE + 10,
          room.y * TILE + 24,
          `▸ ${room.action.label}`,
          {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontSize: '10px',
            color: '#60a5fa',
          },
        );
        hint.setDepth(2);
      }
    }
  }

  private createNpcs(): void {
    for (const npc of NPCS) {
      const x = toPixels(npc.x);
      const y = toPixels(npc.y);

      const halo = this.add.circle(x, y, 22, npc.color, 0.18);
      halo.setDepth(3);
      this.tweens.add({
        targets: halo,
        scale: { from: 0.85, to: 1.15 },
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const body = this.add.circle(x, y, 11, npc.color, 1);
      body.setStrokeStyle(2, 0xffffff, 0.75);
      body.setDepth(4);

      const name = this.add.text(x, y + 18, npc.name, {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '10px',
        color: '#cfd7ea',
      });
      name.setOrigin(0.5, 0);
      name.setDepth(4);
    }
  }

  private createPlayer(): void {
    const rect = this.add.rectangle(
      toPixels(SPAWN.x),
      toPixels(SPAWN.y),
      20,
      20,
      0x3b82f6,
      1,
    );
    rect.setStrokeStyle(2, 0xffffff, 0.9);
    rect.setDepth(5);
    this.physics.add.existing(rect);

    this.player = rect as typeof this.player;
    this.player.body.setCollideWorldBounds(true);

    this.nameLabel = this.add.text(rect.x, rect.y - 22, 'You', {
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: '10px',
      color: '#ffffff',
    });
    this.nameLabel.setOrigin(0.5, 0.5);
    this.nameLabel.setDepth(6);
  }

  // ------------------------------------------------------------------ update

  update(): void {
    if (!this.player) return;
    this.handleMovement();
    this.nameLabel.setPosition(this.player.x, this.player.y - 22);
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
  }

  private updateProximity(): void {
    const room = this.roomAt(this.player.x, this.player.y);
    if ((room?.key ?? null) !== this.currentRoomKey) {
      this.currentRoomKey = room?.key ?? null;
      this.bridge.emit({ type: 'zone_changed', room: room ?? null });
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

    const prompt = nearest
      ? `${nearest.prompt} — ${nearest.name}`
      : room && room.action.kind !== 'info'
        ? `Press E — ${room.action.label}`
        : null;

    if (prompt !== this.currentPrompt) {
      this.currentPrompt = prompt;
      this.bridge.emit({ type: 'prompt', text: prompt });
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
