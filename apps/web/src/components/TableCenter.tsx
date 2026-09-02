import { useEffect, useState } from 'react';
import { useBluffSocket } from '../socket-provider.js';
import { CardView, FlippableCard, formatClaimText } from './shared.js';

export function TableCenter() {
  const { game, room, challenge, clearChallenge } = useBluffSocket();
  const [flipped, setFlipped] = useState(false);

  // Auto-flip animation sequence and auto-dismiss on challenge
  useEffect(() => {
    if (!challenge) {
      setFlipped(false);
      return;
    }

    // Flip cards 200ms after challenge event arrives
    const flipTimer = setTimeout(() => {
      setFlipped(true);
    }, 250);

    // Auto-dismiss reveal after 4 seconds to continue game flow
    const dismissTimer = setTimeout(() => {
      clearChallenge();
    }, 4000);

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(dismissTimer);
    };
  }, [challenge, clearChallenge]);

  if (!game || !room) return null;

  const state = game.game;
  const isMyTurn = state.currentPlayerId === room.selfPlayerId;
  const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId);
  const lastPlayer = state.lastClaim ? state.players.find((p) => p.id === state.lastClaim!.playerId) : null;

  // ── 1. In-Table Challenge / Bluff Reveal Mode ─────
  if (challenge) {
    const challenger = state.players.find((p) => p.id === challenge.challengerId);
    const challenged = state.players.find((p) => p.id === challenge.challengedPlayerId);
    const recipient = state.players.find((p) => p.id === challenge.pileRecipientId);

    return (
      <div className="flex flex-col items-center justify-center text-center z-20 w-full max-w-xs sm:max-w-sm px-2 animate-fade-in">
        {/* Live Call Announcement */}
        <div className="mb-1.5 px-3 py-1 rounded-full bg-red-950/90 border border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.5)]">
          <p className="text-[11px] sm:text-xs font-black text-red-200 tracking-wide uppercase flex items-center gap-1.5">
            <span>📣</span>
            <span>{challenger?.username ?? 'Player'} called BLUFF!</span>
          </p>
        </div>

        {/* Claim Description */}
        <p className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2">
          Claimed {formatClaimText(challenge.revealedCards.length, challenge.claimedRank)} by {challenged?.username ?? 'Opponent'}
        </p>

        {/* In-Place Flipping Cards on the Felt */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 my-1">
          {challenge.revealedCards.map((card, idx) => {
            const isMatch = card.rank === challenge.claimedRank;
            return (
              <FlippableCard
                key={card.id ?? idx}
                card={card}
                flipped={flipped}
                truthStatus={flipped ? (isMatch ? 'correct' : 'incorrect') : undefined}
                size="md"
              />
            );
          })}
        </div>

        {/* Revealed Truth/Bluff Result Banner */}
        {flipped && (
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-black/85 border border-[#a87e2b] shadow-lg animate-fade-in">
            <p
              className={`font-black text-xs sm:text-sm tracking-wide ${
                challenge.wasTruthful ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {challenge.wasTruthful ? 'CLAIM WAS TRUTHFUL' : 'RESULT: CLAIM WAS FALSE'}
            </p>
            <p className="text-[10px] sm:text-xs text-zinc-300 font-semibold mt-0.5">
              {recipient?.username ? `${recipient.username} takes the pile` : 'Pile taken'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── 2. Normal Gameplay Table Center ──────────────
  const claimedCount = state.lastClaim?.cardCount ?? 0;

  return (
    <div className="flex flex-col items-center justify-center text-center z-10 w-full max-w-[13rem] sm:max-w-[15rem] select-none">
      {/* Central Claim Plaque */}
      <div className="claim-plaque rounded-2xl px-3 sm:px-4 py-2 w-full mb-1">
        <div className="flex items-center justify-between border-b border-[#a87e2b]/30 pb-1 mb-1">
          <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            ROUND {state.roundNumber}
          </span>
          <span className="text-[9px] sm:text-[10px] gold-text font-bold">
            {lastPlayer ? `By ${lastPlayer.username}` : 'No plays yet'}
          </span>
        </div>

        <p className="text-[9px] text-zinc-400 uppercase font-semibold tracking-wider">
          CURRENT CLAIM
        </p>
        <p className="gold-gradient-text font-black text-xs sm:text-sm tracking-wide">
          {state.lastClaim ? formatClaimText(state.lastClaim.cardCount, state.lastClaim.claimedRank) : 'START THE ROUND'}
        </p>
      </div>

      {/* Face-Down Claimed Cards on Table (CRITICAL RULE PRESENTATION) */}
      <div className="flex items-center justify-center gap-1 my-1 min-h-[3rem]">
        {claimedCount > 0 ? (
          Array.from({ length: Math.min(claimedCount, 4) }).map((_, i) => (
            <CardView key={i} faceDown size="sm" />
          ))
        ) : (
          <div className="w-12 h-16 rounded-[4px] border border-dashed border-emerald-600/40 grid place-items-center opacity-40">
            <span className="text-zinc-500 text-xs">🂠</span>
          </div>
        )}
      </div>

      {/* Total Pile Count Badge */}
      <div className="flex items-center gap-1.5 mt-0.5 bg-black/70 border border-[#a87e2b]/50 px-2.5 py-0.5 rounded-full">
        <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
          PILE:
        </span>
        <span className="gold-text font-black text-xs sm:text-sm leading-none">
          {state.playingPileCount}
        </span>
      </div>

      {/* Turn Alert Pill */}
      <div className="mt-1.5">
        {isMyTurn ? (
          <span className="px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/70 shadow-[0_0_10px_rgba(52,211,153,0.4)] animate-pulse">
            YOUR TURN
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-black/60 text-zinc-400 border border-zinc-700">
            {currentPlayer ? `${currentPlayer.username}'s Turn` : "Opponent's Turn"}
          </span>
        )}
      </div>
    </div>
  );
}
