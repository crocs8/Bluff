import type { Card } from '@bluff/shared';

// ── Suit Helpers ──────────────────────────────────
export const SUIT_SYMBOL: Record<Card['suit'], string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export function isRedSuit(suit: Card['suit']): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

// ── Realistic Playing Card ────────────────────────
interface CardViewProps {
  card: Card;
  selected?: boolean | undefined;
  onClick?: (() => void) | undefined;
  disabled?: boolean | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
  rotation?: number | undefined;
}

export function CardView({
  card,
  selected = false,
  onClick,
  disabled,
  size = 'md',
  rotation = 0,
}: CardViewProps) {
  const red = isRedSuit(card.suit);

  const sizeClasses = {
    sm: 'w-12 h-16 p-1 text-xs',
    md: 'w-[4.4rem] h-24 p-1.5 text-sm',
    lg: 'w-20 h-28 p-2 text-base',
  }[size];

  const suitIconSize = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  }[size];

  return (
    <button
      type="button"
      aria-label={`${card.rank} of ${card.suit}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
      className={[
        'playing-card flex flex-col justify-between shrink-0 select-none',
        sizeClasses,
        selected ? 'selected' : '',
        disabled ? 'opacity-70 cursor-default' : 'cursor-pointer',
        red ? 'suit-red' : 'suit-black',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Top Left corner: Rank + mini suit */}
      <div className="flex flex-col items-center leading-none">
        <span className="font-extrabold tracking-tight font-sans text-sm">{card.rank}</span>
        <span className="text-xs -mt-0.5">{SUIT_SYMBOL[card.suit]}</span>
      </div>

      {/* Center suit symbol */}
      <div className={`self-center leading-none ${suitIconSize}`}>
        {SUIT_SYMBOL[card.suit]}
      </div>

      {/* Bottom Right corner (inverted): Rank + mini suit */}
      <div className="flex flex-col items-center leading-none rotate-180 self-end">
        <span className="font-extrabold tracking-tight font-sans text-sm">{card.rank}</span>
        <span className="text-xs -mt-0.5">{SUIT_SYMBOL[card.suit]}</span>
      </div>
    </button>
  );
}

// ── Mini Fanned Card Backs for Opponents ──────────
export function FannedCardBacks({ count }: { count: number }) {
  if (count <= 0) return null;
  const displayCount = Math.min(count, 5);
  const angles = [-14, -7, 0, 7, 14];

  return (
    <div className="relative h-6 w-14 mx-auto mb-1 flex items-center justify-center">
      {Array.from({ length: displayCount }).map((_, i) => {
        const offset = (i - (displayCount - 1) / 2) * 4;
        const rot = angles[Math.min(i, angles.length - 1)] ?? 0;
        return (
          <div
            key={i}
            className="card-pattern-back absolute w-4 h-6 rounded-[2px]"
            style={{
              left: `calc(50% - 8px + ${offset}px)`,
              transform: `rotate(${rot}deg)`,
              zIndex: i + 1,
            }}
          />
        );
      })}
    </div>
  );
}

// ── 3D Isometric Playing Pile ─────────────────────
export function PlayingPileView({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center justify-center my-1">
      <div className="relative w-12 h-10 flex items-center justify-center">
        {count > 0 ? (
          <>
            {/* Stacked card layers */}
            <div className="absolute w-10 h-7 rounded-[3px] card-pattern-back translate-y-1.5 opacity-70" />
            <div className="absolute w-10 h-7 rounded-[3px] card-pattern-back translate-y-0.5 rotate-[4deg] opacity-85" />
            <div className="absolute w-10 h-7 rounded-[3px] card-pattern-back rotate-[-2deg] shadow-lg" />
          </>
        ) : (
          <div className="w-10 h-7 rounded-[3px] border border-dashed border-[#24523d] opacity-40" />
        )}
      </div>
      <span className="gold-text font-black text-2xl leading-none mt-1">{count}</span>
    </div>
  );
}

// ── Avatar Colors ─────────────────────────────────
const AVATAR_COLORS = [
  '#c6952e', '#2e7d32', '#1565c0', '#7b1fa2',
  '#c62828', '#00838f', '#558b2f', '#6d4c41',
];

function getAvatarBg(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

// ── Player Seat / Chip ────────────────────────────
export interface PlayerChipProps {
  name: string;
  count: number;
  active: boolean;
  status: string;
  rank?: number | undefined;
  isMe?: boolean | undefined;
  isHost?: boolean | undefined;
  showCardsBack?: boolean | undefined;
}

export function PlayerChip({
  name,
  count,
  active,
  status,
  rank,
  isMe,
  isHost,
  showCardsBack = true,
}: PlayerChipProps) {
  const eliminated = status === 'ELIMINATED';
  const disconnected = status === 'DISCONNECTED';

  return (
    <div className="flex flex-col items-center text-center select-none">
      {/* Mini fanned card backs above opponent */}
      {showCardsBack && !isMe && !eliminated && <FannedCardBacks count={count} />}

      {/* Avatar Circle */}
      <div className="relative">
        <div
          className={[
            'size-11 rounded-full grid place-items-center font-extrabold text-sm border-2 transition-all duration-300',
            active && !eliminated
              ? 'avatar-ring-turn border-[#ffe599] scale-105'
              : 'border-[#b88c22] shadow-md',
            eliminated ? 'opacity-50 border-zinc-600' : '',
          ].join(' ')}
          style={{
            background: eliminated ? '#2a2a2a' : getAvatarBg(name),
            color: '#ffffff',
          }}
        >
          {rank ? `#${rank}` : name[0]?.toUpperCase()}
        </div>

        {/* Host Crown */}
        {isHost && (
          <span className="absolute -top-2.5 -right-1 text-xs" title="Host">
            👑
          </span>
        )}
      </div>

      {/* Name Label */}
      <span className="font-bold text-xs text-zinc-200 mt-1 max-w-[4.5rem] truncate leading-tight block">
        {name} {isMe ? '(You)' : ''}
      </span>

      {/* Card Count / Status Pill */}
      <span
        className={[
          'text-[10px] leading-tight px-1.5 py-0.5 rounded-full mt-0.5 font-semibold',
          disconnected
            ? 'bg-red-950/80 text-red-400 border border-red-800/50'
            : eliminated
              ? 'bg-zinc-800 text-zinc-400'
              : 'bg-black/60 text-[#d4af37] border border-[#a87e2b]/40',
        ].join(' ')}
      >
        {eliminated ? (rank ? `Rank #${rank}` : 'Done') : disconnected ? 'Offline' : `${count} Cards`}
      </span>
    </div>
  );
}

// ── Connection Status Badge ───────────────────────
export function ConnectionBadge({ status }: { status: string }) {
  const isOk = status === 'CONNECTED' || status === 'RECONNECTED';
  const isPending = status === 'CONNECTING' || status === 'RECONNECTING';

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 border border-[#364e40] text-xs">
      <span
        className={`size-2 rounded-full ${
          isOk ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : isPending ? 'bg-amber-400 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className={`text-[11px] font-medium ${isOk ? 'text-emerald-300' : 'text-zinc-400'}`}>
        {isOk ? 'Online' : isPending ? 'Connecting…' : 'Lost'}
      </span>
    </div>
  );
}
