import type { Card, Rank } from '@bluff/shared';

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

// ── Number word converter for claim display ────────
export function formatClaimText(count: number, rank: Rank): string {
  const numberWords: Record<number, string> = {
    1: 'ONE',
    2: 'TWO',
    3: 'THREE',
    4: 'FOUR',
    5: 'FIVE',
    6: 'SIX',
    7: 'SEVEN',
    8: 'EIGHT',
  };

  const rankPlural: Record<Rank, string> = {
    A: 'ACES',
    '2': 'TWOS',
    '3': 'THREES',
    '4': 'FOURS',
    '5': 'FIVES',
    '6': 'SIXES',
    '7': 'SEVENS',
    '8': 'EIGHTS',
    '9': 'NINES',
    '10': 'TENS',
    J: 'JACKS',
    Q: 'QUEENS',
    K: 'KINGS',
  };

  const countWord = numberWords[count] ?? `${count}`;
  const rankWord = count === 1 ? (rank === 'A' ? 'ACE' : rank === 'K' ? 'KING' : rank === 'Q' ? 'QUEEN' : rank === 'J' ? 'JACK' : rank) : (rankPlural[rank] ?? `${rank}S`);
  return `${countWord} ${rankWord}`;
}

// ── Realistic Playing Card ────────────────────────
export interface CardViewProps {
  card?: Card | undefined;
  faceDown?: boolean | undefined;
  selected?: boolean | undefined;
  onClick?: (() => void) | undefined;
  disabled?: boolean | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg' | undefined;
  rotation?: number | undefined;
  truthStatus?: 'correct' | 'incorrect' | undefined;
}

export function CardView({
  card,
  faceDown = false,
  selected = false,
  onClick,
  disabled,
  size = 'md',
  rotation = 0,
  truthStatus,
}: CardViewProps) {
  const sizeClasses = {
    xs: 'w-8 h-12 p-0.5 text-[10px]',
    sm: 'w-11 h-15 p-1 text-xs',
    md: 'w-14 h-20 sm:w-16 sm:h-24 p-1 sm:p-1.5 text-xs sm:text-sm',
    lg: 'w-18 h-26 sm:w-20 sm:h-28 p-1.5 sm:p-2 text-sm sm:text-base',
  }[size];

  if (faceDown || !card) {
    return (
      <div
        style={{ transform: `rotate(${rotation}deg)` }}
        className={[
          'card-pattern-back shrink-0 select-none relative',
          sizeClasses,
          disabled ? 'opacity-70' : '',
        ].filter(Boolean).join(' ')}
      >
        <div className="absolute inset-1 rounded-[2px] border border-blue-400/20" />
      </div>
    );
  }

  const red = isRedSuit(card.suit);

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
        'playing-card flex flex-col justify-between shrink-0 select-none relative',
        sizeClasses,
        selected ? 'selected' : '',
        disabled ? 'opacity-75 cursor-default' : onClick ? 'cursor-pointer' : '',
        red ? 'suit-red' : 'suit-black',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Top Left corner: Rank + mini suit */}
      <div className="flex flex-col items-center leading-none">
        <span className="font-extrabold tracking-tight font-sans text-xs sm:text-sm">{card.rank}</span>
        <span className="text-[10px] sm:text-xs -mt-0.5">{SUIT_SYMBOL[card.suit]}</span>
      </div>

      {/* Center suit symbol */}
      <div className="self-center leading-none text-base sm:text-xl">
        {SUIT_SYMBOL[card.suit]}
      </div>

      {/* Bottom Right corner (inverted): Rank + mini suit */}
      <div className="flex flex-col items-center leading-none rotate-180 self-end">
        <span className="font-extrabold tracking-tight font-sans text-xs sm:text-sm">{card.rank}</span>
        <span className="text-[10px] sm:text-xs -mt-0.5">{SUIT_SYMBOL[card.suit]}</span>
      </div>

      {/* Verification status badge for challenge reveal */}
      {truthStatus && (
        <div className="absolute -bottom-2 -right-1 z-20">
          {truthStatus === 'correct' ? (
            <span className="size-4.5 sm:size-5 rounded-full bg-emerald-600 border border-emerald-300 text-white font-black text-[10px] sm:text-xs grid place-items-center shadow-md">
              ✓
            </span>
          ) : (
            <span className="size-4.5 sm:size-5 rounded-full bg-red-600 border border-red-300 text-white font-black text-[10px] sm:text-xs grid place-items-center shadow-md">
              ✕
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ── Flippable 3D Card (In-Table Reveal) ──────────
export function FlippableCard({
  card,
  flipped = false,
  truthStatus,
  size = 'md',
}: {
  card: Card;
  flipped: boolean;
  truthStatus?: 'correct' | 'incorrect' | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg' | undefined;
}) {
  const sizeClasses = {
    xs: 'w-8 h-12',
    sm: 'w-11 h-15',
    md: 'w-14 h-20 sm:w-16 sm:h-24',
    lg: 'w-18 h-26 sm:w-20 sm:h-28',
  }[size];

  return (
    <div className={`perspective-1000 shrink-0 ${sizeClasses}`}>
      <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
        {/* Front = Face Down Back */}
        <div className="flip-card-front">
          <CardView faceDown size={size} />
        </div>

        {/* Back = Face Up Revealed Card */}
        <div className="flip-card-back">
          <CardView card={card} size={size} truthStatus={truthStatus} />
        </div>
      </div>
    </div>
  );
}

// ── Mini Fanned Card Backs for Opponents ──────────
export function FannedCardBacks({ count }: { count: number }) {
  if (count <= 0) return null;
  const displayCount = Math.min(count, 4);
  const angles = [-10, -3, 3, 10];

  return (
    <div className="relative h-4 w-10 mx-auto mb-1 flex items-center justify-center">
      {Array.from({ length: displayCount }).map((_, i) => {
        const offset = (i - (displayCount - 1) / 2) * 3;
        const rot = angles[Math.min(i, angles.length - 1)] ?? 0;
        return (
          <div
            key={i}
            className="card-pattern-back absolute w-3.5 h-5 rounded-[1.5px]"
            style={{
              left: `calc(50% - 7px + ${offset}px)`,
              transform: `rotate(${rot}deg)`,
              zIndex: i + 1,
            }}
          />
        );
      })}
    </div>
  );
}

// ── Playing Pile View ─────────────────────────────
export function PlayingPileView({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-black/70 border border-[#a87e2b]/50 px-2.5 py-0.5 rounded-full">
      <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
        PILE:
      </span>
      <span className="gold-text font-black text-xs sm:text-sm leading-none">
        {count}
      </span>
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
  chatMessage?: string | undefined;
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
  chatMessage,
}: PlayerChipProps) {
  const eliminated = status === 'ELIMINATED';
  const disconnected = status === 'DISCONNECTED';

  return (
    <div className="flex flex-col items-center text-center select-none relative group">
      {/* Quick Chat speech bubble anchor (prepared for Phase 2) */}
      {chatMessage && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 border border-[#f5c451] text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap z-30 shadow-lg animate-bounce">
          💬 {chatMessage}
        </div>
      )}

      {/* Mini fanned card backs above opponent */}
      {showCardsBack && !isMe && !eliminated && <FannedCardBacks count={count} />}

      {/* Avatar Circle */}
      <div className="relative">
        <div
          className={[
            'size-9 sm:size-11 rounded-full grid place-items-center font-extrabold text-xs sm:text-sm border-2 transition-all duration-300',
            active && !eliminated
              ? 'avatar-ring-turn border-[#ffe599] scale-105'
              : isMe
                ? 'border-[#f5c451] shadow-[0_0_8px_rgba(245,196,81,0.4)]'
                : 'border-[#b88c22] shadow-md',
            eliminated ? 'opacity-40 border-zinc-600' : '',
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
      <span className="font-bold text-[11px] sm:text-xs text-zinc-200 mt-0.5 max-w-[4.5rem] sm:max-w-[5.5rem] truncate leading-tight block">
        {name} {isMe ? '(You)' : ''}
      </span>

      {/* Card Count / Status Pill */}
      <span
        className={[
          'text-[9px] sm:text-[10px] leading-tight px-1.5 py-0.2 rounded-full mt-0.5 font-bold tracking-tight',
          disconnected
            ? 'bg-red-950/90 text-red-400 border border-red-800/60'
            : eliminated
              ? 'bg-zinc-800 text-zinc-400'
              : isMe
                ? 'bg-amber-950/80 text-[#f5c451] border border-amber-500/50'
                : 'bg-black/70 text-[#d4af37] border border-[#a87e2b]/50',
        ].join(' ')}
      >
        {eliminated ? (rank ? `Rank #${rank}` : 'Done') : disconnected ? 'Offline' : `${count} Cards`}
      </span>
    </div>
  );
}

// ── Circular Turn Timer Component ─────────────────
export function TurnTimer({
  secondsLeft,
  totalSeconds = 45,
  isMyTurn = false,
}: {
  secondsLeft: number;
  totalSeconds?: number;
  isMyTurn?: boolean;
}) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const strokeDashoffset = circumference * (1 - progress);

  const isUrgent = secondsLeft <= 10;
  const strokeColor = isUrgent ? '#ef4444' : isMyTurn ? '#34d399' : '#f5c451';

  return (
    <div className="relative flex items-center justify-center size-11 sm:size-12 shrink-0 select-none">
      <svg className="size-full -rotate-90" viewBox="0 0 44 44">
        {/* Background track */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="rgba(0, 0, 0, 0.6)"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="3.5"
        />
        {/* Animated countdown ring */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-linear"
        />
      </svg>
      {/* Centered Seconds Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`font-black text-xs leading-none ${
            isUrgent ? 'text-red-400 animate-pulse' : isMyTurn ? 'text-emerald-300' : 'text-amber-300'
          }`}
        >
          {secondsLeft}s
        </span>
      </div>
    </div>
  );
}

// ── Connection Status Badge ───────────────────────
export function ConnectionBadge({ status }: { status: string }) {
  const isOk = status === 'CONNECTED' || status === 'RECONNECTED';
  const isPending = status === 'CONNECTING' || status === 'RECONNECTING';

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 border border-[#364e40] text-xs">
      <span
        className={`size-1.5 rounded-full ${
          isOk ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : isPending ? 'bg-amber-400 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className={`text-[10px] font-semibold ${isOk ? 'text-emerald-300' : 'text-zinc-400'}`}>
        {isOk ? 'Online' : isPending ? 'Connecting…' : 'Lost'}
      </span>
    </div>
  );
}
