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
        backgroundColor: '#080b14',
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        fps: {
          target: 60,
          // Phaser's delta smoothing clamps the frame delta to the target frame
          // time, so on a machine that cannot hold 60fps the whole simulation
          // runs in slow motion — walking speed would depend on the player's
          // hardware. Use the real elapsed time instead.
          smoothStep: false,
        },
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            // Integrate with the real frame delta. With Arcade's default fixed
            // step, a slow frame rate also slows the avatar down — walking
            // speed would depend on the player's machine.
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
      className="h-[clamp(420px,calc(100dvh-230px),760px)] w-full overflow-hidden bg-ink-950"
    />
  );
}
