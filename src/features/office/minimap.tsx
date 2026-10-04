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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Office minimap"
    >
      <rect width={width} height={height} rx={6} fill="#f1f4f9" />

      {CORRIDORS.map((corridor, index) => (
        <rect
          key={`c${index}`}
          x={corridor.x * SCALE}
          y={corridor.y * SCALE}
          width={corridor.w * SCALE}
          height={corridor.h * SCALE}
          fill="#ffffff"
        />
      ))}

      {ROOMS.map((room) => {
        const isActive = room.key === activeRoomKey;
        return (
          <g key={room.key}>
            <rect
              x={room.x * SCALE}
              y={room.y * SCALE}
              width={room.w * SCALE}
              height={room.h * SCALE}
              rx={2}
              fill={hex(room.color)}
              fillOpacity={1}
              stroke={isActive ? '#2563eb' : '#c3cbda'}
              strokeWidth={isActive ? 1.5 : 0.6}
            />
            {room.action.kind !== 'info' ? (
              <circle
                cx={(room.x + room.w / 2) * SCALE}
                cy={(room.y + room.h / 2) * SCALE}
                r={1.6}
                fill="#60a5fa"
                fillOpacity={0.9}
              />
            ) : null}
          </g>
        );
      })}

      {NPCS.filter((npc) => npc.personaKey).map((npc) => (
        <circle
          key={npc.key}
          cx={(npc.x + 0.5) * SCALE}
          cy={(npc.y + 0.5) * SCALE}
          r={2}
          fill={hex(npc.color)}
          stroke="#ffffff"
          strokeWidth={0.75}
        />
      ))}

      {player ? (
        <g>
          <circle
            cx={(player.x + 0.5) * SCALE}
            cy={(player.y + 0.5) * SCALE}
            r={5}
            fill="#3b82f6"
            fillOpacity={0.25}
          >
            <animate
              attributeName="r"
              values="4;7;4"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx={(player.x + 0.5) * SCALE}
            cy={(player.y + 0.5) * SCALE}
            r={2.4}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1.2}
          />
        </g>
      ) : null}
    </svg>
  );
}
