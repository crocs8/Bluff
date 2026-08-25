import { useEffect, useState } from 'react';
import { RANKS, type Rank } from '@bluff/shared';
import { CardView } from './shared.js';
import { useBluffSocket } from '../socket-provider.js';

export function ActionDock() {
  const { game, room, play, skip, callBluff, submitting, error, clearError } = useBluffSocket();
  const [selected, setSelected] = useState<string[]>([]);
  const [claimedRank, setClaimedRank] = useState<Rank>('A');
  useEffect(() => {
    setClaimedRank(game?.game.roundLockedRank ?? 'A');
  }, [game?.game.roundNumber, game?.game.roundLockedRank]);

  if (!game || !room) return null;

  const { legalActions, hand, roundNumber, roundLockedRank } = game.game;
  const isMyTurn = legalActions.canPlay || legalActions.canSkip || legalActions.canCallBluff;

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

  // Calculate slight fan rotation for cards
  const totalCards = hand.length;
  const getRotation = (index: number) => {
    if (totalCards <= 1) return 0;
    const mid = (totalCards - 1) / 2;
    return (index - mid) * 2.5;
  };

  return (
    <section className="w-full shrink-0 select-none z-20">
      {/* Error banner if action fails */}
      {error && (
        <div className="px-4 pb-2">
          <div className="rounded-xl bg-red-950/90 border border-red-700/80 p-2.5 flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold">⚠</span>
              <span>{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-zinc-400 hover:text-white px-2 py-0.5 rounded"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Cards in Hand Area ───────────────────────── */}
      <div className="relative pt-4 pb-2 overflow-x-auto no-scrollbar">
        <div className="flex justify-center items-end px-4 min-w-max -space-x-4">
          {hand.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-sm font-medium">
              No cards in hand
            </div>
          ) : (
            hand.map((card, idx) => (
              <CardView
                key={card.id}
                card={card}
                selected={selected.includes(card.id)}
                onClick={() => toggleCard(card.id)}
                disabled={!legalActions.canPlay}
                rotation={getRotation(idx)}
                size="md"
              />
            ))
          )}
        </div>
      </div>

      {/* ── Subtitle / Selection prompt ────────────── */}
      <p className="text-center text-[11px] text-zinc-400 font-medium tracking-wide mb-1.5">
        Select 1 - {legalActions.maxPlayCards} cards
      </p>

      {/* ── Horizontal Rank Selector Strip (A, 2, ..., K) ── */}
      <div className="px-3 mb-3">
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1">
          {RANKS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setClaimedRank(r)}
              disabled={roundLockedRank !== undefined}
              className={[
                'rank-strip-btn min-w-[1.65rem] h-8 rounded text-xs font-bold shrink-0 transition-transform active:scale-95',
                claimedRank === r ? 'active' : '',
                roundLockedRank !== undefined ? 'opacity-70 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3 Action Buttons Bar ───────────────────── */}
      <div className="grid grid-cols-3 gap-2 px-3 mb-2">
        {/* CALL BLUFF */}
        <button
          type="button"
          disabled={!legalActions.canCallBluff || submitting}
          onClick={handleCallBluff}
          className={[
            'btn-bluff rounded-xl py-3 px-2 flex items-center justify-center gap-1.5 font-black text-xs sm:text-sm tracking-wider uppercase transition-opacity',
            !legalActions.canCallBluff || submitting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <span className="text-sm">⚠</span>
          <span>CALL BLUFF</span>
        </button>

        {/* SKIP */}
        <button
          type="button"
          disabled={!legalActions.canSkip || submitting}
          onClick={handleSkip}
          className={[
            'btn-skip rounded-xl py-3 px-2 flex items-center justify-center gap-1 font-bold text-xs sm:text-sm tracking-wider uppercase transition-opacity',
            !legalActions.canSkip || submitting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <span>SKIP</span>
          <span className="text-xs tracking-tighter font-extrabold">&gt;&gt;</span>
        </button>

        {/* PLAY */}
        <button
          type="button"
          disabled={!legalActions.canPlay || selected.length === 0 || submitting}
          onClick={handlePlay}
          className={[
            'btn-play rounded-xl py-3 px-2 flex items-center justify-center gap-1 font-black text-xs sm:text-sm tracking-wider uppercase transition-opacity',
            !legalActions.canPlay || selected.length === 0 || submitting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <span>PLAY</span>
          <span className="text-xs">▶</span>
          {selected.length > 0 && <span className="text-xs font-normal">({selected.length})</span>}
        </button>
      </div>

      {/* ── Bottom Utility Bar (Chat / Game # / Audio) ── */}
      <div className="flex items-center justify-between px-4 py-1 text-zinc-500 text-xs safe-bottom">
        <button type="button" className="p-1 rounded hover:text-zinc-300 active:scale-95" title="Chat">
          💬
        </button>
        <span className="font-semibold text-[11px] text-zinc-400 tracking-wider">
          {roundLockedRank ? `ROUND RANK: ${roundLockedRank}` : `Game #${roundNumber}`}
        </span>
        <button type="button" className="p-1 rounded hover:text-zinc-300 active:scale-95" title="Audio">
          🔊
        </button>
      </div>
    </section>
  );
}
