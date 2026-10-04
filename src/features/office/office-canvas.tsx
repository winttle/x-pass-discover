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
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
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
      className="h-[640px] w-full overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-950"
    />
  );
}
