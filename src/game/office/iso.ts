import { GRID_HEIGHT, GRID_WIDTH } from './map';

/**
 * Isometric projection for the 2.5D office.
 *
 * The office still *lives* on the flat tile grid in `map.ts`: collisions, room
 * zones, the minimap and `verify:office` all work in tile space and know
 * nothing about this file. Only drawing goes through here — every visible
 * thing is placed by projecting its tile-space position onto the screen.
 *
 * Tile-space x runs down-right on screen and tile-space y runs down-left, so
 * the north and west edges of the building are the back walls and the camera
 * looks in from the south-east.
 */

/** Half the width and height of one floor tile's diamond, in screen pixels. */
export const HALF_W = 32;
export const HALF_H = 16;

/** Height of the building's back walls — the tallest thing in the scene. */
export const BACK_WALL_HEIGHT = 120;

const MARGIN_X = 96;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 120;

export const ISO_ORIGIN_X = GRID_HEIGHT * HALF_W + MARGIN_X;
export const ISO_ORIGIN_Y = BACK_WALL_HEIGHT + MARGIN_TOP;

export const ISO_WORLD_WIDTH = (GRID_WIDTH + GRID_HEIGHT) * HALF_W + MARGIN_X * 2;
export const ISO_WORLD_HEIGHT =
  ISO_ORIGIN_Y + (GRID_WIDTH + GRID_HEIGHT) * HALF_H + MARGIN_BOTTOM;

/** Screen position of a tile-space point (fractional tiles allowed). */
export function toScreen(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: ISO_ORIGIN_X + (tileX - tileY) * HALF_W,
    y: ISO_ORIGIN_Y + (tileX + tileY) * HALF_H,
  };
}

/** Screen position of the centre of a tile's floor diamond. */
export const tileCenter = (col: number, row: number) => toScreen(col + 0.5, row + 0.5);

/**
 * Painter's-algorithm depth.
 *
 * Everything that stands up is drawn in one-tile pieces, so ordering by the
 * tile-space distance from the back corner is enough for nothing to be drawn
 * over something that stands in front of it. A piece occupying cell (c, r)
 * sorts at its centre, `c + r + 1`; a character sorts at its feet.
 */
export const depthAt = (tileX: number, tileY: number) => tileX + tileY;
