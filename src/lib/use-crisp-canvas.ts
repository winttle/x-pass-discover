'use client';

import { useEffect, type DependencyList, type RefObject } from 'react';

/**
 * Paints a picture drawn in a fixed `width` × `height` frame into a canvas
 * that is shown with `object-cover`, at the size it actually appears times
 * the screen's pixel density (capped at 4×) — so it stays sharp at any window
 * size. It repaints when the canvas is resized, and when `deps` change.
 */
export function useCrispCanvas(
  ref: RefObject<HTMLCanvasElement | null>,
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
  deps: DependencyList,
): void {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    let painted = '';
    const render = (force: boolean) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const shown = Math.max(canvas.clientWidth / width, canvas.clientHeight / height);
      const scale = Math.min(4, Math.max(1, shown * (window.devicePixelRatio || 1)));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      if (!force && painted === `${w}x${h}`) return;
      painted = `${w}x${h}`;
      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(w / width, 0, 0, h / height, 0, 0);
      paint(ctx);
    };
    render(true);
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => render(false));
    });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
