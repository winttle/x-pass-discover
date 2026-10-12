import { GRID_HEIGHT, GRID_WIDTH } from './map';

/**
 * The camera for the 2.5D office.
 *
 * The office still *lives* on the flat tile grid in `map.ts`: collisions, room
 * zones, the minimap and `verify:office` all work in tile space and know
 * nothing about this file. Only drawing goes through here.
 *
 * The view is a fixed perspective photograph of the building: a pinhole camera
 * stands beyond the south wall, raised and pitched down at the floor, so rows
 * further back shrink and the side walls lean away — the way the reference
 * office is shot. The game camera then pans across that picture. Because the
 * perspective never changes, everything static can be painted once.
 *
 * Heights in the art are in "z pixels"; `Z_PER_TILE` of them make one tile.
 */

export const Z_PER_TILE = 36;

const PITCH = (47 * Math.PI) / 180;
const DISTANCE = 52;
const FOCAL = 3300;

/** The camera's x: faces of things left of it show their east side, and vice versa. */
export const CAMERA_X = GRID_WIDTH / 2;
const TARGET_Y = GRID_HEIGHT / 2 + 1;

const COS = Math.cos(PITCH);
const SIN = Math.sin(PITCH);
const CAMERA_Y = TARGET_Y + DISTANCE * COS;
const CAMERA_Z = DISTANCE * SIN;

function raw(x: number, y: number, z: number): { x: number; y: number } {
  const dx = x - CAMERA_X;
  const dy = y - CAMERA_Y;
  const dz = z - CAMERA_Z;
  const depth = -dy * COS - dz * SIN;
  const up = -dy * SIN + dz * COS;
  return { x: (FOCAL * dx) / depth, y: (-FOCAL * up) / depth };
}

const TALLEST = 130 / Z_PER_TILE;
const extremes = [
  raw(0, 0, TALLEST),
  raw(GRID_WIDTH, 0, TALLEST),
  raw(0, GRID_HEIGHT, 0),
  raw(GRID_WIDTH, GRID_HEIGHT, 0),
  raw(0, GRID_HEIGHT, TALLEST),
  raw(GRID_WIDTH, GRID_HEIGHT, TALLEST),
];
const MARGIN_X = 80;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 110;
const minX = Math.min(...extremes.map((p) => p.x));
const maxX = Math.max(...extremes.map((p) => p.x));
const minY = Math.min(...extremes.map((p) => p.y));
const maxY = Math.max(...extremes.map((p) => p.y));

const ORIGIN_X = -minX + MARGIN_X;
const ORIGIN_Y = -minY + MARGIN_TOP;

export const VIEW_WIDTH = Math.ceil(maxX - minX + MARGIN_X * 2);
export const VIEW_HEIGHT = Math.ceil(maxY - minY + MARGIN_TOP + MARGIN_BOTTOM);

/** Screen position of a tile-space point (fractional tiles), `z` in z pixels. */
export function project(tileX: number, tileY: number, z = 0): { x: number; y: number } {
  const p = raw(tileX, tileY, z / Z_PER_TILE);
  return { x: p.x + ORIGIN_X, y: p.y + ORIGIN_Y };
}

/** Screen pixels per z pixel at a spot on the floor — how big a person is there. */
export function scaleAt(tileX: number, tileY: number): number {
  return (project(tileX, tileY, 0).y - project(tileX, tileY, Z_PER_TILE).y) / Z_PER_TILE;
}

/**
 * Painter's-algorithm depth.
 *
 * The camera looks north, so drawing order is simply back row to front row.
 * Standing things are drawn in one-tile pieces sorted at their row's middle;
 * a character sorts at its feet. Within a row, pieces nearer the middle of the
 * picture go last, since it is their sides that face outwards.
 */
export const depthAt = (tileY: number) => tileY;
export const pieceDepth = (col: number, row: number) =>
  row + 0.5 - Math.abs(col + 0.5 - CAMERA_X) * 0.0005;
