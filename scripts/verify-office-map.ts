/**
 * Verifies the BITE office floor plan.
 *
 *   npm run verify:office
 *
 * Furniture is solid, so moving a desk can quietly wall off a room or trap an
 * NPC. This flood-fills from the spawn point through the real collision grid
 * (walls + solid props) and asserts that every room, every door and every NPC
 * is still reachable, and that no prop or NPC has been placed inside a wall.
 */
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  NPCS,
  PROPS,
  ROOMS,
  SPAWN,
  buildCollisionGrid,
} from '@/game/office/map';

let failures = 0;
const check = (label: string, cond: unknown, detail = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✓' : '✗ FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const grid = buildCollisionGrid();

const reachable = Array.from({ length: GRID_HEIGHT }, () =>
  Array<boolean>(GRID_WIDTH).fill(false),
);

check('spawn point is walkable', !grid[SPAWN.y][SPAWN.x], `(${SPAWN.x},${SPAWN.y})`);

const stack: Array<[number, number]> = [[SPAWN.x, SPAWN.y]];
reachable[SPAWN.y][SPAWN.x] = true;
let visited = 0;
while (stack.length > 0) {
  const [x, y] = stack.pop()!;
  visited += 1;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= GRID_WIDTH || ny >= GRID_HEIGHT) continue;
    if (grid[ny][nx] || reachable[ny][nx]) continue;
    reachable[ny][nx] = true;
    stack.push([nx, ny]);
  }
}

const walkable = grid.flat().filter((isWall) => !isWall).length;
check(
  'the whole floor is one connected space (no sealed-off pockets)',
  visited === walkable,
  `${visited} reachable of ${walkable} walkable tiles`,
);

console.log('\n=== rooms ===');
for (const room of ROOMS) {
  const tiles: Array<[number, number]> = [];
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) tiles.push([x, y]);
  }
  const open = tiles.filter(([x, y]) => !grid[y][x]);
  const reached = open.filter(([x, y]) => reachable[y][x]);
  check(
    `${room.key} is reachable`,
    open.length > 0 && reached.length === open.length,
    `${reached.length}/${open.length} open tiles reachable`,
  );

  for (const door of room.doors) {
    check(
      `  door (${door.x},${door.y}) of ${room.key} is open`,
      !grid[door.y][door.x] && reachable[door.y][door.x],
    );
  }
}

console.log('\n=== NPCs ===');
for (const npc of NPCS) {
  const onFloor = !grid[npc.y][npc.x];
  const approachable = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(
    ([dx, dy]) => reachable[npc.y + dy]?.[npc.x + dx],
  );
  check(
    `${npc.key} stands on open floor and can be approached`,
    onFloor && approachable,
    `(${npc.x},${npc.y}) floor=${onFloor} approachable=${approachable}`,
  );
}

console.log('\n=== furniture sanity ===');
for (const prop of PROPS) {
  const w = prop.w ?? 1;
  const h = prop.h ?? 1;
  let insideARoom = false;
  for (const room of ROOMS) {
    if (
      prop.x >= room.x &&
      prop.x + w <= room.x + room.w &&
      prop.y >= room.y &&
      prop.y + h <= room.y + room.h
    ) {
      insideARoom = true;
      break;
    }
  }
  check(
    `${prop.kind} at (${prop.x},${prop.y}) sits inside a room`,
    insideARoom,
  );
}

for (const room of ROOMS) {
  for (const door of room.doors) {
    const blocking = PROPS.filter(
      (prop) =>
        prop.solid &&
        door.x >= prop.x &&
        door.x < prop.x + (prop.w ?? 1) &&
        door.y >= prop.y &&
        door.y < prop.y + (prop.h ?? 1),
    );
    check(`no furniture blocks the ${room.key} door (${door.x},${door.y})`, blocking.length === 0);
  }
}

for (const npc of NPCS) {
  const on = PROPS.filter(
    (prop) =>
      prop.solid &&
      npc.x >= prop.x &&
      npc.x < prop.x + (prop.w ?? 1) &&
      npc.y >= prop.y &&
      npc.y < prop.y + (prop.h ?? 1),
  );
  check(`no furniture is standing on ${npc.key}`, on.length === 0);
}

console.log(`\n${failures === 0 ? '✅ OFFICE MAP VERIFIED' : `❌ ${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
