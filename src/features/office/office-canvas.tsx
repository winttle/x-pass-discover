'use client';

import { useEffect, useRef } from 'react';
import type { OfficeBridge } from '@/game/office/bridge';

/**
 * Mounts the Phaser game.
 *
 * Phaser is browser-only, so it is imported dynamically inside the effect and
 * never reaches the server bundle. The scene receives the bridge and reports
 * interactions back through it.
 */
export function OfficeCanvas({ bridge }: { bridge: OfficeBridge }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;

    async function boot() {
      // Phaser's ESM build exposes named exports only — there is no default.
      const [Phaser, { OfficeScene }] = await Promise.all([
        import('phaser'),
        import('@/game/office/office-scene'),
      ]);
      if (cancelled || !containerRef.current) return;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        backgroundColor: '#eef1f7',
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        fps: {
          target: 60,
          /*
           * `min` is the slowest frame rate the simulation will honour: a frame
           * longer than 1/30s is treated as 1/30s. That bounds how far the
           * avatar can move in a single physics step (~7px against 32px walls),
           * which is what stops a stalled tab or a long GC pause from letting
           * the player walk straight through a wall.
           */
          min: 30,
          /*
           * Smoothing stays ON: it carries Phaser's protection against
           * pathological deltas (tab restore, context loss). Combined with
           * `fixedStep: false` below, movement is wall-clock based rather than
           * frame-count based, so walking speed does not depend on the
           * player's hardware.
           */
          smoothStep: true,
        },
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            // Integrate with the real frame delta. Arcade's default fixed step
            // runs at most one 1/60s step per frame with no catch-up, so a slow
            // frame rate also slows the avatar down. The clamped delta above is
            // what keeps this safe.
            fixedStep: false,
          },
        },
        scene: [new OfficeScene(bridge)],
      });

      // Debug handle for driving the office from devtools or an automated
      // browser test. The scene carries only map geometry, which is already
      // visible on screen — no scenario or persona data is reachable from it.
      (window as unknown as { __xpassGame?: unknown }).__xpassGame = game;
    }

    void boot();

    return () => {
      cancelled = true;
      game?.destroy(true);
      game = null;
      delete (window as unknown as { __xpassGame?: unknown }).__xpassGame;
    };
  }, [bridge]);

  return (
    <div
      ref={containerRef}
      className="h-[clamp(420px,calc(100dvh-230px),760px)] w-full overflow-hidden bg-canvas"
    />
  );
}
