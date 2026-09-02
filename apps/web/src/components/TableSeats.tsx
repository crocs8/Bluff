import type { PlayerView } from '@bluff/game-engine';
import { PlayerChip } from './shared.js';

type OpponentPlayer = PlayerView['players'][number];

interface TableSeatsProps {
  opponents: OpponentPlayer[];
  currentPlayerId?: string | undefined;
  hostPlayerId?: string | undefined;
}

export function TableSeats({
  opponents,
  currentPlayerId,
  hostPlayerId,
}: TableSeatsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {opponents.map((player, idx) => {
        const pos = getSeatPosition(opponents.length, idx);
        return (
          <div
            key={player.id}
            className="absolute pointer-events-auto transition-all duration-300"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <PlayerChip
              name={player.username}
              count={player.cardCount}
              status={player.status}
              rank={player.rank}
              active={currentPlayerId === player.id}
              isHost={player.id === hostPlayerId}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Continuous Collision-Free Elliptical Seating ──
export function getSeatPosition(total: number, index: number): { x: number; y: number } {
  // Preset tuned placements for small counts (1, 2, 3, 4, 5)
  const presets: Record<number, { x: number; y: number }[]> = {
    1: [{ x: 50, y: 13 }],
    2: [{ x: 18, y: 30 }, { x: 82, y: 30 }],
    3: [{ x: 16, y: 32 }, { x: 50, y: 12 }, { x: 84, y: 32 }],
    4: [{ x: 14, y: 36 }, { x: 34, y: 14 }, { x: 66, y: 14 }, { x: 86, y: 36 }],
    5: [{ x: 12, y: 38 }, { x: 28, y: 16 }, { x: 50, y: 10 }, { x: 72, y: 16 }, { x: 88, y: 38 }],
  };

  if (presets[total]?.[index]) {
    return presets[total]![index]!;
  }

  // General mathematical distribution for 6 to 9 opponents around the top ellipse
  // Angle spans from -165 deg (bottom left) over the top (-90 deg) to -15 deg (bottom right)
  const startAngle = Math.PI * 0.95;
  const endAngle = Math.PI * 0.05;
  const step = (startAngle - endAngle) / (total - 1);
  const angle = startAngle - index * step;

  const centerX = 50;
  const centerY = 46;
  const radiusX = 39;
  const radiusY = 36;

  const x = Math.round(centerX - radiusX * Math.cos(angle));
  const y = Math.round(centerY - radiusY * Math.sin(angle));

  return {
    x: Math.max(8, Math.min(92, x)),
    y: Math.max(8, Math.min(68, y)),
  };
}
