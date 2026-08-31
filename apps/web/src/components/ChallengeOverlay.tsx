import { useEffect, useState } from 'react';
import { useBluffSocket } from '../socket-provider.js';
import { CardView, FannedCardBacks } from './shared.js';
import type { Rank } from '@bluff/shared';

function formatClaim(count: number, rank: Rank): string {
  const words: Record<number, string> = {
    1: 'ONE',
    2: 'TWO',
    3: 'THREE',
    4: 'FOUR',
    5: 'FIVE',
    6: 'SIX',
    7: 'SEVEN',
    8: 'EIGHT',
  };
  const rankNames: Record<Rank, string> = {
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
  const countWord = words[count] ?? `${count}`;
  const rankWord = count === 1 ? (rank === 'A' ? 'ACE' : rank === 'K' ? 'KING' : rank === 'Q' ? 'QUEEN' : rank === 'J' ? 'JACK' : rank) : (rankNames[rank] ?? `${rank}S`);
  return `${countWord} ${rankWord}`;
}

export function ChallengeOverlay() {
  const { challenge, game, room, clearChallenge } = useBluffSocket();
  const [phase, setPhase] = useState<'calling' | 'revealing' | 'result'>('calling');

  useEffect(() => {
    if (!challenge) {
      setPhase('calling');
      return;
    }
    setPhase('calling');
    const t1 = setTimeout(() => setPhase('revealing'), 1000);
    const t2 = setTimeout(() => setPhase('result'), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [challenge]);

  if (!challenge || !game || !room) return null;

  const players = game.game.players;
  const challenger = players.find((p) => p.id === challenge.challengerId);
  const challenged = players.find((p) => p.id === challenge.challengedPlayerId);

  const challengerName = challenger?.id === room.selfPlayerId ? 'You' : (challenger?.username ?? 'Challenger');
  const challengedName = challenged?.id === room.selfPlayerId ? 'You' : (challenged?.username ?? 'Challenged');

  const wasTruthful = challenge.wasTruthful;
  const isBluff = !wasTruthful;

  const recipient = players.find((p) => p.id === challenge.pileRecipientId) ?? (isBluff ? challenged : challenger);
  const recipientName = recipient?.id === room.selfPlayerId ? 'You' : (recipient?.username ?? 'Player');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop select-none">
      {/* ── Phase 1: Calling (⚡ CHALLENGE!) ──────────────── */}
      {phase === 'calling' && (
        <div className="modal-dialog w-full max-w-sm rounded-3xl p-6 text-center border-red-600/80 shadow-[0_0_40px_rgba(220,38,38,0.4)]">
          <div className="flex items-center justify-center gap-1.5 text-red-500 font-black text-xl mb-3 tracking-wider">
            <span>⚡</span>
            <span>CHALLENGE!</span>
          </div>

          {/* Challenger Avatar */}
          <div className="size-16 rounded-full mx-auto mb-2 border-2 border-red-500 bg-[#7f1d1d] grid place-items-center text-white text-xl font-bold shadow-lg">
            {challenger?.username[0]?.toUpperCase() ?? 'C'}
          </div>

          <p className="text-zinc-100 font-bold text-base">
            {challengerName} called <span className="text-red-400 font-black">BLUFF!</span>
          </p>

          <p className="text-zinc-400 text-xs mt-3">
            {challengedName}&apos;s claim was
          </p>
          <p className="gold-gradient-text font-black text-lg mt-0.5 tracking-wider">
            {formatClaim(challenge.revealedCards.length, challenge.claimedRank)}
          </p>
        </div>
      )}

      {/* ── Phase 2: Revealing Cards ─────────────────────── */}
      {phase === 'revealing' && (
        <div className="modal-dialog w-full max-w-sm rounded-3xl p-6 text-center border-red-600/80 shadow-[0_0_40px_rgba(220,38,38,0.4)]">
          <div className="flex items-center justify-center gap-1.5 text-red-500 font-black text-xl mb-4 tracking-wider">
            <span>⚡</span>
            <span>CHALLENGE!</span>
          </div>

          <div className="my-6">
            <FannedCardBacks count={challenge.revealedCards.length} />
          </div>

          <div className="w-full rounded-xl bg-red-950/80 border border-red-700/60 p-3 text-red-300 font-black text-sm tracking-widest uppercase animate-pulse">
            REVEALING CARDS…
          </div>
        </div>
      )}

      {/* ── Phase 3: Final Result (BLUFF CAUGHT! or CHALLENGE FAILED) ──── */}
      {phase === 'result' && (
        <div
          className={[
            'modal-dialog w-full max-w-sm rounded-3xl p-6 text-center',
            isBluff
              ? 'border-red-600/80 shadow-[0_0_50px_rgba(220,38,38,0.4)]'
              : 'border-amber-500/80 shadow-[0_0_50px_rgba(245,196,81,0.4)]',
          ].join(' ')}
        >
          {/* Result Title */}
          <h2
            className={[
              'text-3xl font-black tracking-wider mb-1 uppercase',
              isBluff ? 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,196,81,0.8)]',
            ].join(' ')}
          >
            {isBluff ? 'BLUFF CAUGHT!' : 'CHALLENGE FAILED'}
          </h2>

          <p className="text-zinc-300 text-xs mb-4">
            {isBluff
              ? `${challengerName} caught ${challengedName} bluffing.`
              : `${challengerName} challenged ${challengedName}, but ${challengedName} was truthful.`}
          </p>

          {/* Revealed Cards Display */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
            {challenge.revealedCards.map((card) => (
              <CardView key={card.id} card={card} size="sm" />
            ))}
          </div>

          {/* Pile Recipient Info */}
          <div className="my-3 p-2.5 rounded-xl bg-black/50 border border-[#f5c451]/30">
            <p className="text-zinc-200 font-bold text-sm">
              <span className="text-[#f5c451]">{recipientName}</span> takes the pile
            </p>
          </div>

          {/* Recipient Avatar */}
          <div className="size-12 rounded-full mx-auto my-2 border-2 border-[#f5c451] bg-[#1a3827] grid place-items-center text-white font-bold text-base avatar-ring-turn">
            {recipient?.username[0]?.toUpperCase() ?? 'P'}
          </div>

          {/* Continue Button */}
          <button
            type="button"
            onClick={clearChallenge}
            className="w-full mt-4 btn-play rounded-xl py-3.5 font-black text-sm tracking-wider uppercase"
          >
            CLOSE
          </button>
        </div>
      )}
    </div>
  );
}
