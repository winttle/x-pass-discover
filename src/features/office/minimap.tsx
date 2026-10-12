'use client';

import {
  CORRIDORS,
  GRID_HEIGHT,
  GRID_WIDTH,
  NPCS,
  ROOMS,
} from '@/game/office/map';

const SCALE = 5;

const hex = (value: number) => `#${value.toString(16).padStart(6, '0')}`;

/** Plan view: north is up, as it is for the office camera. */
const project = (x: number, y: number) => ({ x: x * SCALE, y: y * SCALE });

const outline = (x: number, y: number, w: number, h: number) =>
  [project(x, y), project(x + w, y), project(x + w, y + h), project(x, y + h)]
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

/**
 * Minimap.
 *
 * Drawn in React from the same map definition Phaser renders, rather than as a
 * second Phaser camera: UI belongs on the React side of the bridge, it stays
 * crisp at any DPI, and it costs the game loop nothing. Phaser only reports the
 * player's tile.
 */
export function Minimap({
  player,
  activeRoomKey,
}: {
  player: { x: number; y: number } | null;
  activeRoomKey: string | null;
}) {
  const width = GRID_WIDTH * SCALE;
  const height = GRID_HEIGHT * SCALE;
  const marker = player ? project(player.x + 0.5, player.y + 0.5) : null;

  return (
    <svg
      viewBox={`-4 -4 ${width + 8} ${height + 8}`}
      className="h-auto w-full"
      role="img"
      aria-label="Office minimap"
    >
      <polygon
        points={outline(0, 0, GRID_WIDTH, GRID_HEIGHT)}
        fill="#2a3242"
        stroke="#ffffff"
        strokeOpacity={0.15}
      />

      {CORRIDORS.map((corridor, index) => (
        <polygon
          key={`c${index}`}
          points={outline(corridor.x, corridor.y, corridor.w, corridor.h)}
          fill="#d9b48a"
          fillOpacity={0.55}
        />
      ))}

      {ROOMS.map((room) => {
        const isActive = room.key === activeRoomKey;
        const center = project(room.x + room.w / 2, room.y + room.h / 2);
        return (
          <g key={room.key}>
            <polygon
              points={outline(room.x, room.y, room.w, room.h)}
              fill={hex(room.color)}
              fillOpacity={isActive ? 1 : 0.78}
              stroke={isActive ? '#60a5fa' : '#1d2433'}
              strokeWidth={isActive ? 1.6 : 0.6}
            />
            {room.action.kind !== 'info' ? (
              <circle cx={center.x} cy={center.y} r={2} fill="#2563eb" />
            ) : null}
          </g>
        );
      })}

      {NPCS.filter((npc) => npc.personaKey).map((npc) => {
        const at = project(npc.x + 0.5, npc.y + 0.5);
        return (
          <circle
            key={npc.key}
            cx={at.x}
            cy={at.y}
            r={2.4}
            fill={hex(npc.color)}
            stroke="#ffffff"
            strokeWidth={0.8}
          />
        );
      })}

      {marker ? (
        <g>
          <circle cx={marker.x} cy={marker.y} r={5} fill="#3b82f6" fillOpacity={0.3}>
            <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle
            cx={marker.x}
            cy={marker.y}
            r={2.8}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1.4}
          />
        </g>
      ) : null}
    </svg>
  );
}
