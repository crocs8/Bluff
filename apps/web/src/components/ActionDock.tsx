import { useEffect, useState } from 'react';
import { RANKS, type Rank } from '@bluff/shared';
import { CardView, TurnTimer } from './shared.js';
import { useBluffSocket } from '../socket-provider.js';

export function ActionDock() {
  const { game, room, play, skip, callBluff, submitting, error, clearError } = useBluffSocket();
  const [selected, setSelected] = useState<string[]>([]);
  const [claimedRank, setClaimedRank] = useState<Rank>('A');
  const [secondsLeft, setSecondsLeft] = useState(0);

  const deadline = game?.turnDeadlineAt;
  useEffect(() => {
    if (deadline === undefined) {
      setSecondsLeft(0);
      return;
    }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [deadline]);

  if (!game || !room) return null;

  const { legalActions, hand, roundNumber, roundLockedRank } = game.game;
  const isMyTurn = legalActions.canPlay || legalActions.canSkip || legalActions.canCallBluff;

  useEffect(() => {
    if (roundLockedRank) {
      setClaimedRank(roundLockedRank);
    }
  }, [roundNumber, roundLockedRank]);

  function toggleCard(id: string) {
    if (!legalActions.canPlay) return;
    setSelected((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= legalActions.maxPlayCards
          ? cur
          : [...cur, id],
    );
  }

  function handlePlay() {
    if (selected.length === 0 || !legalActions.canPlay || submitting) return;
    play(selected, roundLockedRank ?? claimedRank);
    setSelected([]);
  }

  function handleSkip() {
    if (!legalActions.canSkip || submitting) return;
    skip();
    setSelected([]);
  }

  function handleCallBluff() {
    if (!legalActions.canCallBluff || submitting) return;
    callBluff();
    setSelected([]);
  }

  // Calculate dynamic overlap for fanned hand so cards never overflow screen
  const totalCards = hand.length;
  const getFanRotation = (index: number) => {
    if (totalCards <= 1) return 0;
    const mid = (totalCards - 1) / 2;
    return (index - mid) * Math.min(2.5, 20 / totalCards);
  };

  // Overlap spacing calculation
  const overlapMarginClass =
    totalCards > 12
      ? '-ml-8 sm:-ml-9'
      : totalCards > 8
        ? '-ml-6 sm:-ml-7'
        : totalCards > 5
          ? '-ml-4 sm:-ml-5'
          : totalCards > 2
            ? '-ml-2 sm:-ml-3'
            : 'ml-1';

  return (
    <section className="w-full shrink-0 select-none z-20 flex flex-col justify-end">
      {/* Error banner if action fails */}
      {error && (
        <div className="px-3 pb-1 max-w-md mx-auto w-full">
          <div className="rounded-xl bg-red-950/95 border border-red-700/80 p-2 flex items-center justify-between text-xs text-red-200 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold text-sm">⚠</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-zinc-400 hover:text-white px-2 py-0.5 rounded"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Player's Fanned Hand ──────────────────────── */}
      <div className="relative pt-3 pb-1 w-full max-w-xl mx-auto overflow-x-hidden flex justify-center items-end px-2">
        {hand.length === 0 ? (
          <div className="py-4 text-center text-zinc-500 text-xs font-semibold">
            No cards in hand
          </div>
        ) : (
          <div className="flex items-end justify-center py-2 px-1">
            {hand.map((card, idx) => (
              <div
                key={card.id}
                className={idx > 0 ? overlapMarginClass : ''}
                style={{ zIndex: idx + 1 }}
              >
                <CardView
                  card={card}
                  selected={selected.includes(card.id)}
                  onClick={() => toggleCard(card.id)}
                  disabled={!legalActions.canPlay}
                  rotation={getFanRotation(idx)}
                  size="md"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Unlocked Rank Selector Strip (Only shown when choosing first rank) ── */}
      {roundLockedRank === undefined && legalActions.canPlay && (
        <div className="px-3 max-w-md mx-auto w-full mb-1">
          <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-0.5">
            {RANKS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setClaimedRank(r)}
                className={[
                  'rank-strip-btn min-w-[1.5rem] h-7 rounded text-[11px] font-bold shrink-0 transition-transform active:scale-95',
                  claimedRank === r ? 'active' : '',
                ].join(' ')}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Action Controls & Timer Bar ─────────────── */}
      <div className="max-w-md mx-auto w-full px-3 pb-2 safe-bottom">
        <div className="flex items-center gap-2">
          {/* Circular Turn Timer */}
          <TurnTimer
            secondsLeft={secondsLeft}
            totalSeconds={45}
            isMyTurn={isMyTurn}
          />

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-3 gap-1.5 flex-1">
            {/* SKIP */}
            <button
              type="button"
              disabled={!legalActions.canSkip || submitting}
              onClick={handleSkip}
              className={[
                'btn-skip rounded-xl py-3 px-1.5 flex items-center justify-center gap-1 font-bold text-xs sm:text-sm tracking-wider uppercase transition-all',
                !legalActions.canSkip || submitting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:scale-95',
              ].join(' ')}
            >
              <span>SKIP</span>
              <span className="text-xs font-black">&gt;&gt;</span>
            </button>

            {/* PLAY */}
            <button
              type="button"
              disabled={!legalActions.canPlay || selected.length === 0 || submitting}
              onClick={handlePlay}
              className={[
                'btn-play rounded-xl py-3 px-1.5 flex items-center justify-center gap-1 font-black text-xs sm:text-sm tracking-wider uppercase transition-all',
                !legalActions.canPlay || selected.length === 0 || submitting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:scale-95',
              ].join(' ')}
            >
              <span>PLAY</span>
              {selected.length > 0 && <span className="text-[11px] font-normal">({selected.length})</span>}
            </button>

            {/* CALL BLUFF */}
            <button
              type="button"
              disabled={!legalActions.canCallBluff || submitting}
              onClick={handleCallBluff}
              className={[
                'btn-bluff rounded-xl py-3 px-1.5 flex items-center justify-center gap-1 font-black text-xs sm:text-sm tracking-wider uppercase transition-all',
                !legalActions.canCallBluff || submitting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer active:scale-95',
              ].join(' ')}
            >
              <span className="text-xs">⚠</span>
              <span>CALL BLUFF</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
